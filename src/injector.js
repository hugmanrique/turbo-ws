import { createDataFrame } from './frames/create';

// Avoids having to create a wrapper or modify turbo-net's class prototypes
const functions = {
  send(data) {
    const frame = createDataFrame(data);

    this.write(frame);
  }
};

export default function injectMethods(socket) {
  Object.keys(functions).forEach(funcName => {
    socket[funcName] = functions[funcName];
  });
}
