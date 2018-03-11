import { EMPTY_BUFFER } from '../util';
import { opCodes, frameByteLimit, frameTwoByteLimit } from '../constants';
import { toBuffer, allocMetaBuffer, writePayloadLength } from '../buffer';

function createFrame(fin, opCode, payload, convertPayload) {
  if (convertPayload) {
    payload = toBuffer(payload);
  }

  const meta = generateMeta(fin, opCode, payload);

  return createFrameBuffer(meta, payload);
}

function createFrameBuffer(meta, payload) {
  // Calculating the length is faster than a for loop
  return Buffer.concat([meta, payload], meta.length + payload.length);
}

export const createTextFrame = data => createFrame(true, opCodes.TEXT, data);

export const createBinaryFrame = (data, first, fin) => {
  return createFrame(fin, first ? opCodes.BINARY : opCodes.CONTINUATION, data);
};

export const createPingFrame = payload =>
  createFrame(true, opCodes.PING, payload, true);

// payload was sent by the client, already a Buffer
export const createPongFrame = payload =>
  createFrame(true, opCodes.PONG, payload);

export function createCloseFrame(code, reason) {
  let payload = EMPTY_BUFFER;

  // No status code was provided
  if (code && code !== 1005) {
    payload = Buffer.from(`--${reason ? reason : ''}`);
    payload.writeUInt16BE(code, 0);
  }

  return createFrame(true, opCodes.CLOSE, payload);
}

// Creates the metadata part of the frame
function generateMeta(fin = false, opCode, payload) {
  const { length } = payload;
  const meta = allocMetaBuffer(length);

  meta[0] = (fin ? 128 : 0) + opCode;

  if (length < frameByteLimit) {
    // Length fits in 1 byte
    meta[1] += length;
  } else if (length < frameTwoByteLimit) {
    // Length fits in 2 bytes
    meta[1] += frameByteLimit;
    meta.writeUInt16BE(length, 2);
  } else {
    meta[1] += frameByteLimit + 1;
    writePayloadLength(length);
  }

  return meta;
}
