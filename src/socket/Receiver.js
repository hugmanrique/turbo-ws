import { Writable } from 'stream';
import { isValidUtf8, isValidStatusCode } from '../validate';
import { unmask } from '../buffers';
import {
  opCodes,
  frameSizeLimit,
  frameSizeMult,
  EMPTY_BUFFER
} from '../constants';

const statusCodeKey = Symbol('status-code');
const stopLoopKey = Symbol('stop-loop');

export const states = {
  GET: 0,
  GET_PAYLOAD_LENGTH_16: 1,
  GET_PAYLOAD_LENGTH_64: 2,
  GET_MASK: 3,
  GET_DATA: 4,
  INFLATING: 5
};

class Receiver extends Writable {
  constructor(extensions, maxPayload) {
    super();

    this.buffers = [];
    this.bufferedBytes = 0;
    this.maxPayload = maxPayload | 0;

    this.payloadLength = 0;
    this.fragmented = 0;
    this.masked = false;
    this.fin = false;
    this.opCode = 0;

    this.totalPayloadLength = 0;
    this.messageLength = 0;
    this.fragments = new Set();

    this.extensions = extensions;
    this.state = states.GET;
    this.loop = false;
  }

  consume(length) {
    this.bufferedBytes -= length;
    const buffer = this.buffers[0];

    if (length === buffer.length) {
      return this.buffers.shift();
    } else if (length < buffer.length) {
      this.buffers[0] = buffer.slice(length);

      return buffer.slice(0, length);
    }

    const dst = Buffer.allocUnsafe(length);

    do {
      if (length >= buffer.length) {
        this.buffers.shift().copy(dst, dst.length - length);
      } else {
        buffer.copy(dst, dst.length - length, 0, length);
      }

      length -= buffer.length;
    } while (length > 0);

    return dst;
  }

  initParseLoop(callback) {
    this.loop = true;

    try {
      while (this.loop) {
        switch (this.state) {
          case states.GET:
            this.getInfo();
            break;
          case states.GET_PAYLOAD_LENGTH_16:
            this.getPayloadLength16();
            break;
          case states.GET_PAYLOAD_LENGTH_64:
            this.getPayloadLength64();
            break;
          case states.GET_MASK:
            this.getMask();
            break;
          case states.GET_DATA:
            this.getData(callback);
            break;
          // Inflating state
          default:
            this.loop = false;
            return;
        }
      }
    } catch (err) {
      this.loop = false;
      callback(err);
    }
  }

  // Read first 2 bytes of frame
  getInfo() {
    if (this.bufferedBytes < 2) {
      this.loop = false;
      return;
    }

    const buffer = this.consume(2);

    if ((buffer[0] & 0x30) !== 0x0) {
      error('RSV2 and RSV3 must be clear', 1002);
    }

    const compressed = (buffer[0] & 0x40) === 0x40;

    if (compressed) {
      // && !decompressionEnabled
      error('RSV1 must be clear', 1002);
    }

    this.fin = (buffer[0] & 0x80) === 0x80;
    this.opCode = buffer[0] & 0xf;
    this.payloadLength = buffer[1] & 0x7f;

    if (this.opCode === opCodes.CONTINUATION) {
      if (compressed) {
        error('RSV1 must be clear', 1002);
      }

      if (!this.fragmented) {
        error('Invalid opCode 0', 1002);
      }

      this.opCode = this.fragmented;
    } else if (this.opCode === opCodes.TEXT || this.opCode === opCodes.BINARY) {
      if (this.fragmented) {
        error(`Invalid opCode ${this.opCode}`, 1002);
      }

      this.compressed = compressed;
    } else if (isControlOpCode(this.opCode)) {
      if (!this.fin) {
        error('FIN must be set', 1002);
      }

      if (compressed) {
        error('RSV1 must be clear', 1002);
      }

      if (this.payloadLength > 0x7d) {
        error(`Invalid payload length ${this.payloadLength}`, 1002);
      }
    } else {
      error(`Invalid opCode ${this.opCode}`, 1002);
    }

    if (!this.fin && !this.fragmented) {
      this.fragmented = this.opCode;
    }

    this.masked = (buffer[1] & 0x80) === 0x80;
    const length = this.payloadLength;

    if (length === 126) {
      this.state = states.GET_PAYLOAD_LENGTH_16;
    } else if (length === 127) {
      this.state = states.GET_PAYLOAD_LENGTH_64;
    } else {
      return this.haveLength();
    }
  }

  getPayloadLength16() {
    if (this.bufferedBytes < 2) {
      this.loop = false;
      return;
    }

    this.payloadLength = this.consume(2).readUInt16BE(0);
    return this.haveLength();
  }

  getPayloadLength64() {
    if (this.bufferedBytes < 8) {
      this.loop = false;
      return;
    }

    const buffer = this.consume(8);
    const num = buffer.readUInt32BE(0);

    if (num > frameSizeLimit) {
      error('Payload length > 2^53 - 1', 1009);
    }

    this.payloadLength = num * frameSizeMult + buffer.readUInt32BE(4);
    return this.haveLength();
  }

  haveLength() {
    if (this.payloadLength && !isControlOpCode(this.opCode)) {
      this.totalPayloadLength += this.payloadLength;

      // Check max payload size
      if (this.maxPayload > 0 && this.totalPayloadLength > this.maxPayload) {
        error('Maximum payload size exceeded', 1009);
      }
    }

    this.state = this.masked ? states.GET_MASK : states.GET_DATA;
  }

  getMask() {
    if (this.bufferedBytes < 4) {
      this.loop = false;
      return;
    }

    this.mask = this.consume(4);
    this.state = states.GET_DATA;
  }

  getData(callback) {
    let data = EMPTY_BUFFER;

    if (this.payloadLength) {
      if (this.bufferedBytes < this.payloadLength) {
        this.loop = false;
        return;
      }

      data = this.consume(this.payloadLength);

      if (this.masked) {
        unmask(data, this.mask);
      }
    }

    if (isControlOpCode(this.opCode)) {
      return this.controlMessage(data, this.mask);
    }

    // Let extensions process the data
    for (const [, extension] of this.extensions) {
      const stopRead = extension.processData(this, data, callback);

      if (stopRead) {
        return;
      }
    }

    if (data.length) {
      this.messageLength = this.totalPayloadLength;
      this.fragments.add(data);
    }

    return this.dataMessage();
  }

  dataMessage() {
    if (this.fin) {
      const { messageLength, fragments } = this;

      this.totalPayloadLength = 0;
      this.messageLength = 0;
      this.fragmented = 0;
      this.fragments.clear();

      const data = toBuffer(fragments, messageLength);

      if (this.opCode === opCodes.BINARY) {
        this.emit('message', data);
      } else {
        validateUtf8(data, true);

        this.emit('message', data.toString());
      }
    }

    this.state = states.GET_INFO;
  }

  controlMessage(data) {
    if (this.opCode === opCodes.CLOSE) {
      this.loop = false;

      if (!data.length) {
        this.emit('conclude', 1005);
        this.end();
      } else if (data.length === 1) {
        error('Invalid payload length 1', 1002, false);
      } else {
        const code = data.readUInt16BE(0);

        if (!isValidStatusCode(code)) {
          error(`Invalid status code ${code}`, 1002, false);
        }

        const buffer = data.slice(2);

        validateUtf8(buffer);

        this.emit('conclude', code, buffer.toString());
        this.end();
      }

      return;
    }

    this.emit(this.opCode === opCodes.PING ? 'ping' : 'pong', data);
    this.state = states.GET_INFO;
  }
}

function validateUtf8(buffer, stopLoop) {
  if (!isValidUtf8(buffer)) {
    error('Invalid UTF-8 sequence', 1007, stopLoop, Error);
  }
}

function error(message, statusCode, stopLoop = true, Constructor = RangeError) {
  const err = new Constructor(message);
  err[statusCodeKey] = statusCode;
  err[stopLoopKey] = stopLoop;

  throw err;
}

function isControlOpCode(opCode) {
  return opCode > 0x7 && opCode < 0xb;
}

function toBuffer(fragments, messageLength) {
  if (fragments.length === 1) {
    // TODO Avoid creating an entire iterator to get the first value
    return fragments.values().next().value;
  }

  if (fragments.length > 1) {
    return Buffer.concat(fragments, messageLength);
  }

  return EMPTY_BUFFER;
}

export default Receiver;
