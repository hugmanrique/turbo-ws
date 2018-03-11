export const opCodes = {
  CONTINUATION: 0x0,
  TEXT: 0x1,
  BINARY: 0x2,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xa
};

export const states = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

export const frameByteLimit = 126;
export const frameTwoByteLimit = Math.pow(2, 32);

export const supportedVersion = '13';
export const protocolSwitchCode = 101;

export function isControlFrame(opCode) {
  return opCode >= opCodes.CLOSE;
}
