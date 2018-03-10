import { createTextFrame, createBinaryFrame } from './frames/create';

// Avoids having to create a wrapper or modify turbo-net's class prototypes
const functions = {
  send(data) {
    let frame;

    if (Buffer.isBuffer(data)) {
      // TODO Split buffer in chunks
      frame = createBinaryFrame(data, true, true);
    } else if (typeof data === 'string') {
      frame = createTextFrame(data);
    } else {
      data = JSON.stringify(data);
      frame = createTextFrame(data);
    }

    this.write(frame);
  }
};

export default function injectMethods(socket) {
  Object.keys(functions).forEach(funcName => {
    socket[funcName] = functions[funcName];
  });
}
