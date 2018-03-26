class Sender {
  constructor(socket) {
    this.socket = socket;
    this.firstFragment = true;

    // TODO Implement compression
    this.compress = false;

    this.bufferedBytes = 0;
    this.queue = [];
  }
}

export function frame(data, options) {
  const merge = data.length < 1024;
  const offset = 2;
  let payloadLength = data.length;

  if (data.length >= 65536) {
  }
}

export default Sender;
