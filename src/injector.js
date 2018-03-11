import { createPingFrame, createCloseFrame } from './frames/create';
import { states } from './constants';
import { wrapInFrame } from './buffer';
import { appendToFrameBuffer } from './util';

// Avoids having to create a wrapper or modify turbo-net's class prototypes
const functions = {
  send(data) {
    const frame = wrapInFrame(data);

    this.write(frame);
  },
  ping(payload) {
    const frame = createPingFrame(payload);

    this.write(frame);
  }
};

export default function injectMethods(socket) {
  Object.keys(functions).forEach(funcName => {
    socket[funcName] = functions[funcName];
  });

  // Don't override socket.close method
  socket.on('close', () => {
    const { state, frameBuffer } = socket;

    if (state === states.CONNECTING || state === states.OPEN) {
      const frame = createCloseFrame(1006, '');

      socket.write(frame);
    }

    socket.state = states.CLOSED;

    // Emit 'end' event
    appendToFrameBuffer(socket, null);
  });
}
