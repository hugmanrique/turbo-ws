import crypto from 'crypto';
import { parse } from 'url';
import { magicValue } from './constants';

import statusCodes from 'turbo-http/http-status';
export { statusCodes };

// Upgrade utils
export function asksForUpgrade(req) {
  return (
    req.method === 'GET' &&
    req.getHeader('Upgrade').toLowerCase() === 'websocket'
  );
}

export function shouldHandleRequest(server, req, version) {
  return (
    isValidVersion(version) && server.shouldHandle(req) // TODO Create version func
  );
}

function isValidVersion(version) {
  return version === 8 || version === 13;
}

export function pathEquals(path, req) {
  return parse(req.url).pathname === path;
}

export function getUpgradeKey(clientKey) {
  return crypto
    .createHash('sha1')
    .update(`${clientKey}${magicValue}`, 'binary')
    .digest('base64');
}

// EventEmitter utils

export function addListeners(server, events) {
  const eventNames = Object.keys(events);

  for (const event of eventNames) {
    server.on(event, events[event]);
  }

  // Return anonymous function to remove all the added listeners when called
  return function() {
    for (const event of eventNames) {
      server.removeListener(event, events[event]);
    }
  };
}

export function forwardEvent(server, eventName) {
  return server.emit.bind(server, eventName);
}
