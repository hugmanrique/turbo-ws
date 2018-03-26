import { createBinaryFrame, createTextFrame } from './frames/create';
import { frameByteLimit, frameTwoByteLimit } from './constants';

export function toBuffer(payload, checkBuffer = true) {
  if (checkBuffer && Buffer.isBuffer(payload)) {
    return payload;
  }

  if (typeof payload !== 'string') {
    payload = JSON.stringify(payload);
  }

  return Buffer.from(payload);
}

export function wrapInFrame(payload) {
  if (Buffer.isBuffer(payload)) {
    // TODO Split buffer in chunks
    return createBinaryFrame(payload, true, true);
  }

  payload = toBuffer(payload, false);
  return createTextFrame(payload);
}

export function allocMetaBuffer(length) {
  return Buffer.alloc(
    2 + (length < frameByteLimit ? 0 : length < frameTwoByteLimit ? 2 : 8)
  );
}

/**
 * Writes 8 bytes containing the length (4 + 4)
 * Note: JS doesn't support integers greater than 2^53
 */
export function writePayloadLength(buffer, length) {
  buffer.writeUInt32BE(Math.floor(length / frameTwoByteLimit), 2);
  buffer.writeUInt32BE(length % frameTwoByteLimit, 6);
}
