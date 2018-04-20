export const magicValue = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export const EMPTY_BUFFER = Buffer.alloc(0);

export const opCodes = {
  CONTINUATION: 0x0,
  TEXT: 0x1,
  BINARY: 0x2,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xa
};

export const states = {
  CONNECTING: 1,
  OPEN: 2,
  CLOSING: 3,
  CLOSED: 4
};

// Allow 30 seconds to complete the close handshake
export const CLOSE_TIMEOUT = 30 * 1000;

/**
 * Maximum safe integer in JavaScript is 2^53 - 1. turbo-ws
 * returns an error if payload length is greater than this number.
 */
export const frameSizeLimit = Math.pow(2, 53 - 32) - 1;
export const frameSizeMult = Math.pow(2, 32);
