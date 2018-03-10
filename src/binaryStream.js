import { Readable } from 'stream';

/**
 * Simple wrapper for stream.Readable that represents
 * the readable stream for binary frames.
 */
export default class BinaryStream extends Readable {
  // Pushs are made outside _read
  _read() {}

  addData(data) {
    this.push(data);
  }

  end() {
    this.push(null);
  }
}
