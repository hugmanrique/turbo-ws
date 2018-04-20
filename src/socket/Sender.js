import { EMPTY_BUFFER, opCodes } from '../constants';

/**
 * HyBi sender implementation
 * @see https://tools.ietf.org/html/rfc6455
 */
export default class Sender {
  constructor(socket) {
    this.socket = socket;
    this.firstFragment = true;

    // TODO Implement compression
    this.compress = false;

    this.bufferedBytes = 0;
    this.deflating = false;
    this.queue = [];
  }

  /**
   * Sends a close message.
   * @param {(Number|undefined)} code The status code of the body
   * @param {String} data The message of the body
   * @param {Function} callback
   */
  close(code, data, callback) {
    let buffer;

    if (!code) {
      buffer = EMPTY_BUFFER;
    } else if (typeof code !== 'number') {
      throw new TypeError('First argument must be a valid error code number');
    }

    buffer = Buffer.allocUnsafe(2 + (data ? Buffer.byteLength(data) : 0));
    buffer.writeUInt16BE(code, 0, true);

    if (data) {
      buffer.write(data, 2);
    }

    if (this.deflating) {
      this.queue([this._close, buffer, callback]);
    } else {
      this._close(buffer, callback);
    }
  }

  _close(data, callback) {
    this.sendFrame(
      frame(data, {
        fin: true,
        opCode: opCodes.CLOSE
      }),
      callback
    );
  }

  /**
   * Sends a ping message.
   * @param {*} data The message to send
   * @param {Function} callback
   */
  ping(data, callback) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    }

    if (this.deflating) {
      this.queue([this._ping, data, callback]);
    } else {
      this.ping(data, callback);
    }
  }

  _ping(data, callback) {
    this.sendFrame(
      frame(data, {
        fin: true,
        opCode: opCodes.PING
      }),
      callback
    );
  }

  /**
   * Sends a pong message
   * @param {*} data The message to send
   * @param {Function} callback
   */
  pong(data, callback) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    }

    if (this.deflating) {
      this.queue([this._pong, data, callback]);
    } else {
      this._pong(data, callback);
    }
  }

  _pong(data, callback) {
    this.sendFrame(
      frame(data, {
        fin: true,
        opCode: opCodes.PONG
      }),
      callback
    );
  }

  /**
   * Sends a data message.
   * @param {*} data The message to send
   * @param {Object} options
   * @param {Boolean} options.compress Whether or not to compress data.
   * @param {Boolean} options.binary Whether data is binary or text.
   * @param {Boolean} options.fin Whether the fragment is the last one.
   * @param {Function} callback
   */
  send(data, { compress, binary, fin }, callback) {
    let opCode = binary ? opCodes.BINARY : opCodes.TEXT;
    let rsv1 = compress;

    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    }

    if (compress) {
      throw new Error('Unsupported operation, not implemented yet');
    }

    if (this.firstFragment) {
      this.firstFragment = false;

      // TODO Implement compression limit

      this.compress = rsv1;
    } else {
      rsv1 = false;
      opCode = opCodes.CONTINUATION;
    }

    if (fin) {
      this.firstFragment = true;
    }

    if (compress) {
      // TODO
    } else {
      this.sendFrame(
        frame(data, {
          fin,
          rsv1: false,
          opCode
        }),
        callback
      );
    }
  }

  /**
   * Executes queued send operations
   */
  dequeue() {
    while (!this.deflating && this.queue.length) {
      const [fn, ...params] = this.queue.shift();

      this.bufferedBytes = params[0].length;
      fn.apply(this, params);
    }
  }

  /**
   * Enqueues a send operation
   * @param {Array} params Send operation parameters.
   */
  queue(params) {
    this.bufferedBytes += params[1].length;
    this.queue.push(params);
  }

  /**
   * Sends a frame
   * @param {Buffer[]} buffers The frame to send
   * @param {Function} callback
   */
  sendFrame(buffers, callback) {
    const multiple = buffers.length === 2;

    // Attach callback to last write
    this.socket.write(buffers[0], !multiple && callback);
    this.socket.write(buffers[1], multiple && callback);
  }
}

/**
 * Frames a piece of data into multiple buffers.
 * @param {Buffer} data The data to frame.
 * @param {Number} options.opCode The opCode
 * @param {Boolean} options.fin Whether or not to set the FIN bit
 * @param {Boolean} options.rsv1 Whether or not to set the RSV1 bit
 * @return {Buffer[]} The framed data as a list of Buffer instances
 */
function frame(data, { fin, opCode, rsv1 }) {
  const merge = data.length < 1024;
  let offset = 2;
  let payloadLength = data.length;

  if (data.length >= 65536) {
    offset += 8;
    payloadLength = 127;
  } else if (data.length > 125) {
    offset += 2;
    payloadLength = 126;
  }

  const target = Buffer.allocUnsafe(merge ? data.length + offset : offset);

  target[0] = fin ? opCode | 0x80 : opCode;

  if (rsv1) {
    target[0] |= 0x40;
  }

  if (payloadLength === 126) {
    target.writeUInt16BE(data.length, 2, true);
  } else if (payloadLength === 127) {
    target.writeUInt32BE(0, 2, true);
    target.writeUInt32BE(data.length, 6, true);
  }

  target[1] = payloadLength;

  if (merge) {
    data.copy(target, offset);
    return [target];
  }

  return [target, data];
}
