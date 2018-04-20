import { parse, serialize } from '@hugmanrique/ws-extensions';

/* eslint-disable no-unused-vars */

export default class Extension {
  constructor(options, maxPayload) {
    this.options = options;
    this.maxPayload = maxPayload;
  }

  /**
   * Get extension name
   */
  static get name() {}

  /**
   * Accept an extension negotiation offer.
   * @param {Array} offers Extension negotiation offers
   * @return {Object} Accepted params
   */
  static accept(offers) {}

  processData(receiver, data, callback) {}
}

export function handleNegotiation(server, socket, req) {
  const { extensions, options: { maxPayload } } = server;

  if (!extensions.length) {
    return;
  }

  socket.extensions = new Map();
  const { extensions: negotiated } = socket;

  try {
    const offers = parseExtensions(req.getHeader('Sec-WebSocket-Extensions'));

    for (const Extension of extensions) {
      const extName = Extension.name;
      const offers = getOffers(offers, extName);

      const accepted = Extension.accept(offers);

      if (!accepted) {
        continue;
      }

      const instance = new Extension(accepted, maxPayload);

      negotiated.set(extName, instance);
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

/**
 * Builds the Sec-WebSocket-Extension header field value.
 *
 * @param {Object} extensions A Map containing extName -> instance entries.
 * @return {String} A string representing the given extension map.
 */
export function serializeExtensions(extensions) {
  let header = '';

  for (const [name, { options }] of extensions) {
    header += serialize(name, options);
  }

  return header;
}
