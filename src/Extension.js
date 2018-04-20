import { parse, serialize } from '@hugmanrique/ws-extensions';

/* eslint-disable no-unused-vars */

export default class Extension {
  constructor(options = {}, maxPayload) {
    this.options = options;
    this.maxPayload = maxPayload;
  }

  /**
   * Get extension name
   */
  static get name() {}

  /**
   * Accept an extension negotiation offer.
   * @param {Array} offers Extension negotiation offers. Contains parsed args for each offer.
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
    const offers = parse(req.getHeader('Sec-WebSocket-Extensions'));

    for (const Extension of extensions) {
      const extName = Extension.name;
      const extOffers = getOfferParams(offers, extName);

      const accepted = Extension.accept(extOffers);

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

function getOfferParams(offers, extensionName) {
  return offers
    .filter(({ name }) => name === extensionName)
    .map(offer => offer.params);
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
    header += serialize(name, options) + ', ';
  }

  if (!header) {
    return header;
  }

  return header.substring(0, header.length - 2);
}
