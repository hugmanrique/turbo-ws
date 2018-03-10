import crypto from 'crypto';
import statuses from 'turbo-http/http-status';
import { parse } from 'url';

import BinaryStream from './binaryStream';

const WS_MAGIC_VALUE = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
export const EMPTY_BUFFER = Buffer.alloc(0);

export const getAcceptKey = clientKey => {
  return crypto
    .createHash('sha1')
    .update(`${clientKey}${WS_MAGIC_VALUE}`)
    .digest('base64');
};

export const isValidPath = (path, req) => {
  return path === '' || getPath(req) === path;
};

const getPath = req => parse(req.url).pathname;

export const getResponseCode = code => Buffer.from(statuses[code]);

export const asksForUpgrade = (req, headers, clientKey) => {
  return (
    req.method === 'GET' &&
    headers.get('Upgrade') === 'websocket' &&
    headers.get('Connection').includes('Upgrade') &&
    clientKey
  );
};

export const unmask = (buffer, maskOffset, payload) => {
  for (let i = 0; i < payload.length; i++) {
    payload[i] ^= buffer[maskOffset + i % 4];
  }
};

export const appendToFrameBuffer = (socket, buffer) => {
  if (!buffer) {
    return (socket.frameBuffer = null);
  }

  const original = socket.frameBuffer;

  socket.frameBuffer = original ? original + buffer : buffer;
};

export const createBinaryBuffer = socket => {
  // TODO Implement BinaryStream
  return (socket.frameBuffer = new BinaryStream());
};
