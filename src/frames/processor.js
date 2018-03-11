import { opCodes, states } from '../constants';
import { createPongFrame, createCloseFrame } from './create';
import { appendToFrameBuffer, createBinaryBuffer } from '../util';

export default function processFrame(socket, { fin, opCode, payload }) {
  const { state, frameBuffer } = socket;

  // Handle control frames
  switch (opCode) {
    case opCodes.CLOSE:
      if (state === states.CLOSING) {
        socket.close();
      } else if (state === states.OPEN) {
        processCloseFrame(socket, payload);
      }

      return true;
    case opCodes.PING:
      if (state === states.OPEN) {
        const frame = createPongFrame(payload);

        socket.write(frame);
      }

      return true;
    case opCodes.PONG:
      socket.emit('pong', payload.toString());
      return true;
  }

  if (state !== states.OPEN) {
    // Ignore if connection isn't open
    return true;
  }

  if (opCode === opCodes.CONTINUATION && !frameBuffer) {
    // Unexpected continuation frame
    return false;
  } else if (opCode !== opCodes.CONTINUATION && frameBuffer) {
    // Last frame sequence didn't finish successfully
    return false;
  }

  return processDataFrame(socket, opCode, fin, payload);
}

function processDataFrame(socket, opCode, fin, payload) {
  let { frameBuffer } = socket;

  if (opCode === opCodes.CONTINUATION) {
    // Get the original opCode
    opCode = typeof frameBuffer === 'string' ? opCodes.TEXT : opCodes.BINARY;
  }

  if (opCode === opCodes.TEXT) {
    payload = payload.toString();
    [frameBuffer] = appendToFrameBuffer(socket, payload, false);

    if (fin) {
      socket.emit('text', frameBuffer);

      // Clear frame buffer
      appendToFrameBuffer(socket, null);
    }
  } else {
    if (!frameBuffer) {
      [frameBuffer] = createBinaryBuffer();

      socket.emit('binary', frameBuffer);
    }

    appendToFrameBuffer(socket, payload, true);

    if (fin) {
      // Emits 'end' event
      frameBuffer.end();
      appendToFrameBuffer(socket, null);
    }
  }

  return true;
}

function processCloseFrame(socket, payload) {
  const hasStatus = payload.length > 1;
  const code = hasStatus ? payload.readUInt16BE(0) : 1005;
  const reason = hasStatus ? payload.slice(2).toString() : '';

  const frame = createCloseFrame(code, reason);
  writeAndEmit(socket, frame, 'close');

  socket.state = states.CLOSED;
}

function writeAndEmit(socket, frame, event, data = {}) {
  socket.write(frame);

  socket.emit(event, data);
}
