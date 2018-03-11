import { opCodes, frameByteLimit, frameTwoByteLimit } from '../constants';
import { unmask } from '../util';

const validOpCodes = Object.values(opCodes);

// https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
export default function extractFrame(buffer) {
  if (buffer.length < 2) {
    return;
  }

  // Last frame in sequence?
  let b = buffer[0];
  const hb = b >> 4;

  // Ignore RSV1, RSV2 and RSV3 extensions
  if (hb % 8) {
    return;
  }

  const fin = hb === opCodes.CLOSE;
  const opCode = b % 16;

  if (!isValidOpCode(opCode)) {
    return;
  }

  if (opCode >= opCodes.CLOSE && !fin) {
    // Control frames must not be fragmented
    return;
  }

  b = buffer[1];
  const hasMask = b >> 7;

  if (!hasMask) {
    // Frames sent by clients must be masked to
    // prevent proxy cache poisoning attacks
    // Check https://stackoverflow.com/a/33262989/4514467
    return;
  }

  let length = b % 128;
  let offset = 6;

  if (checkBufferLength(buffer, offset, length)) {
    return;
  }

  // Get new start and length values
  [offset, length] = getPayloadLength(buffer, offset, length);

  if (checkBufferLength(buffer, offset, length)) {
    return;
  }

  const payload = buffer.slice(offset, offset + length);

  unmask(buffer, offset - 4, payload);

  return { fin, opCode, payload };
}

function getPayloadLength(buffer, offset, length) {
  if (length === frameByteLimit) {
    length = buffer.readUInt16BE(2);
    offset += 2;
  } else if (length === frameByteLimit + 1) {
    length =
      buffer.readUInt32BE(2) * frameTwoByteLimit + buffer.readUInt32BE(6);
    offset += 8;
  }

  return [offset, length];
}

const isValidOpCode = opCode => validOpCodes.includes(opCode);

const checkBufferLength = (buffer, start, length) =>
  buffer.length < start + length;
