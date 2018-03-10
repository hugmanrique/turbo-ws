import { createTextFrame, createBinaryFrame } from './frames/create';

const funcs = {
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

// Don't mess with the net.Socket prototype
export default function injectMethods(socket) {
  Object.keys(funcs).forEach(funcName => {
    socket[funcName] = funcs[funcName];
  });
}
