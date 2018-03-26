import { EventEmitter } from 'events';
import http from 'turbo-http';

import {
  statusCodes,
  asksForUpgrade,
  shouldHandleRequest,
  pathEquals,
  getUpgradeKey,
  addListeners,
  forwardEvent
} from './util';

import { EMPTY_BUFFER } from './constants';

export default class Server extends EventEmitter {
  constructor({
    maxPayload = 100 * 1024 * 1024,
    extensions = [],
    server,
    host,
    port,
    path = ''
  }) {
    super();

    if (!server && (!host || !port)) {
      throw new TypeError(
        'Either the "server" or the "host" and "port" options must be specified'
      );
    }

    if (!server) {
      server = http.createServer(this.handleRequest);
      server.listen(port);
    }

    // TODO Document how to attach request callback for custom servers

    this.server = server;
    this.options = { path, maxPayload };
    this.extensions = new Set(extensions);

    for (const extension of this.extensions) {
      extension.setup(maxPayload);
    }

    addListeners(server, {
      listening: forwardEvent('listening'),
      error: forwardEvent('error')
    });
  }

  handleRequest(req, res) {
    const { socket } = req;

    // Handle premature socket errors
    socket.on('error', onSocketError);

    if (!asksForUpgrade(req)) {
      return this.askToUpgrade(res);
    }

    const version = req.getHeader('Sec-WebSocket-Version');

    if (!shouldHandleRequest(this, req, version)) {
      return closeConnection(socket, res, 400);
    }

    /*for (const extension of this.extensions) {

    }*/

    // TODO Handle extension negotiation

    this.upgradeConnection(req, res);
  }

  askToUpgrade(res) {
    const body = statusCodes[426];

    // Ask the client to upgrade its protocol
    res.statusCode = 426;
    res.setHeader('Content-Type', 'text/plain');
    res.end(body);
  }

  upgradeConnection(req, res) {
    const { socket } = req;

    if (!socket.readable || !socket.writable) {
      return socket.destroy();
    }

    const clientKey = req.getHeader('Sec-WebSocket-Key');
    const key = getUpgradeKey(clientKey);

    res.statusCode = 101;

    res.setHeader('Upgrade', 'websocket');
    res.setHeader('Connection', 'upgrade');
    res.setHeader('Sec-WebSocket-Accept', key);

    // Finish the handshake but keep connection open
    res.end(EMPTY_BUFFER, 0);

    // Remove connection error listener
    socket.removeListener('error', onSocketError);

    this.emit('connection', socket, req);
  }

  // See if request should be handled by this server
  shouldHandle(req) {
    const { path } = this.options;

    return path === '' || pathEquals(path, req);
  }
}

function closeConnection(socket, res, code, message) {
  message = message || statusCodes[code];

  res.statusCode = code;
  res.setHeader('Connection', 'close');
  res.setHeader('Content-Type', 'text/plain');

  res.end(message);

  socket.removeListener('error', onSocketError);
  socket.close();
}

function onSocketError() {
  this.destroy();
}
