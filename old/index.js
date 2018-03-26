import { EventEmitter } from 'events';
import http from 'turbo-http';
import {
  EMPTY_BUFFER,
  getResponseCode,
  isValidPath,
  getAcceptKey,
  asksForUpgrade,
  setState
} from './util';

import { states, supportedVersion, protocolSwitchCode } from './constants';

import extractFrame from './frames/extractor';
import processFrame from './frames/processor';
import { wrapInFrame } from './buffer';
import injectMethods from './injector';

export default class Server extends EventEmitter {
  constructor({ path = '', readBufferSize = 32 * 1024, ...opts } = {}) {
    super();
    this.handleRequest = this.handleRequest.bind(this);

    this.path = path;
    this.readBuffer = Buffer.alloc(readBufferSize);
    this.server = http.createServer(opts, this.handleRequest);
  }

  listen(port) {
    return new Promise(res => {
      this.server.listen(port, res);
    });
  }

  handleRequest(req, res) {
    const { path } = this;
    setState(res, states.CONNECTING);

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
    this.exchange(req, res);
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

  exchange(req, { socket }) {
    const { readBuffer } = this;

    injectMethods(socket);

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

    socket.state = states.OPEN;
    this.emit('connection', socket, req);
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

    setState(res, states.CLOSED);
    res.end(message);
  }

  broadcast(data) {
    const frame = wrapInFrame(data);

    for (const socket of this.getConnections()) {
      const { state } = socket;

      if (state === states.OPEN) {
        socket.write(frame);
      }
    }
  }

  close() {
    this.getConnections().forEach(socket => {
      socket.close();
    });

    return new Promise(res => {
      this.server.close(res);
    }).then(() => this.emit('close'));
  }

  getConnections() {
    return this.server.connections;
  }
}
