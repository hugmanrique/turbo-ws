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

  /**
   * Accept an extension negotiation offer.
   * @param {Array} offers Extension negotiation offers
   * @return {Object} Accepted params
   */
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
      const offers = getOffers(offers, extName);

      const accepted = extension.accept(offers);

      if (!accepted) {
        continue;
      }

      negotiated.set(extName, accepted);
    }
  } catch (err) {
    return err;
  }
}

function getOffers(offers, extensionName) {
  return offers.filter(({ name }) => name === extensionName);
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
