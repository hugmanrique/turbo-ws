import { EventEmitter } from 'events';
import http from 'turbo-http';
import {
  EMPTY_BUFFER,
  getResponseCode,
  isValidPath,
  getAcceptKey,
  asksForUpgrade
} from './util';

import { supportedVersion, protocolSwitchCode } from './constants';

import extractFrame from './frames/extractor';
import processFrame from './frames/processor';
import injectMethods from './injector';

export default class Server extends EventEmitter {
  constructor({ path = '', readBufferSize = 32 * 1024 } = {}) {
    super();
    this.handleRequest = this.handleRequest.bind(this);

    this.path = path;
    this.readBuffer = Buffer.alloc(readBufferSize);
    this.server = http.createServer(this.handleRequest);
  }

  listen(port) {
    return new Promise(res => {
      this.server.listen(port, res);
    });
  }

  handleRequest(req, res) {
    const { path } = this;

    if (!isValidPath(path, req)) {
      return this.closeConnection(res, 400);
    }

    return this.handleUpgrade(req, res);
  }

  handleUpgrade(req, res) {
    const headers = req.getAllHeaders();
    const version = headers.get('Sec-WebSocket-Version');
    const clientKey = headers.get('Sec-WebSocket-Key');

    if (version !== supportedVersion) {
      return this.closeConnection(res, 400, {
        'Sec-WebSocket-Version': supportedVersion
      });
    }

    if (!asksForUpgrade(req, headers, clientKey)) {
      return this.closeConnection(res, 400);
    }

    this.sendUpgrade(req, res, clientKey);
    this.exchange(res);
  }

  sendUpgrade(req, res, clientKey) {
    const key = getAcceptKey(clientKey);

    res.statusCode = protocolSwitchCode;
    res.setHeader('Upgrade', 'websocket');
    res.setHeader('Connection', 'Upgrade');
    res.setHeader('Sec-WebSocket-Accept', key);

    // Finish the handshake but keep the connection open
    res.end(EMPTY_BUFFER, 0);
  }

  exchange({ socket }) {
    const { readBuffer } = this;

    injectMethods(socket);

    // TODO Actually emit events instead of replying with the same message
    socket.read(readBuffer, (err, buffer) => {
      if (err) {
        socket.close();
        throw err;
      }

      const frame = extractFrame(buffer);

      if (!frame) {
        return;
      }

      processFrame(socket, frame);
    });

    this.emit('connection', socket);
  }

  closeConnection(res, code, headers = {}) {
    const message = getResponseCode(code);

    res.statusCode = code;
    res.setHeader('Connection', 'close');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', message.length);

    Object.keys(headers).forEach(key => {
      res.setHeader(key, headers[key]);
    });

    res.end(message);
  }

  close() {
    this.emit('close');

    this.getConnections().forEach(socket => {
      // TODO Send closing frame
      socket.close();
    });
  }

  getConnections() {
    return this.server.connections;
  }
}
