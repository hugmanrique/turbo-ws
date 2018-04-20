import { parse } from '@hugmanrique/ws-extensions';

/* eslint-disable no-unused-vars */

class Extension {
  constructor(options) {
    this.options = options;
  }

  setup(maxPayload) {
    this.maxPayload = maxPayload;
  }

  /**
   * Get extension name
   */
  getName() {}

  accept(offers) {}

  processData(receiver, data, callback) {}
}

export function handleNegotiation(server, socket, req) {
  const { extensions } = server;

  if (!extensions.length) {
    return;
  }

  socket.extensions = new Map();
  const { extensions: negotiated } = socket;

  try {
    const offers = parseExtensions(req.getHeader('Sec-WebSocket-Extensions'));

    for (const extension of extensions) {
      const extName = extension.getName();
      const bestOffer = getBestOffer(offers, extName);

      if (!bestOffer) {
        continue;
      }

      negotiated.set(extName, extension);
    }
  } catch (err) {
    return err;
  }
}

function getBestOffer(offers, name) {
  // The first offer is considered the best one
  for (const offer of offers) {
    if (offer.name === name) {
      return offer;
    }
  }
}

/**
 * Parse the 'Sec-WebSocket-Extensions' header
 * @throws SyntaxError if the header is invalid.
 */
function parseExtensions(header) {
  const offers = [];

  if (!header) {
    return offers;
  }

  return parse(header);
}

export default Extension;
