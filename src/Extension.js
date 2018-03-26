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

export function handleNegotiation(server, socket, req) {}

// Prettier pls
const tokenChars = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 0 - 15
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 16 - 31
  0,
  1,
  0,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  1,
  1,
  0,
  1,
  1,
  0, // 32 - 47
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  0,
  0,
  0, // 48 - 63
  0,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 64 - 79
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  1,
  1, // 80 - 95
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 96 - 111
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  1,
  0,
  1,
  0 // 112 - 127
];

/**
 * Parse the 'Sec-WebSocket-Extensions' header
 */
function parseExtensions(header) {
  const offers = {};

  if (!header) {
    return offers;
  }

  const params = {};
  let mustUnescape = false;
  let isEscaping = false;
  let inQuotes = false;
  let extensionName;
  let paramName;
  let start = -1;
  let end = -1;

  for (let i = 0; i < header.length; i++) {
    const char = header.charCodeAt(i);

    if (!extensionName) {
      if (end === -1 && tokenChars[code] === 1) {
        if (start === -1) {
          start = i;
        }
      }
    }
  }
}

export default Extension;
