import { createPingFrame } from './frames/create';
import { wrapInFrame } from './buffer';

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
}
