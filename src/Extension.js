/* eslint-disable no-unused-vars */

class Extension {
  constructor(options, maxPayload) {
    this.options = options;
    this.maxPayload = maxPayload;
  }

  /**
   * Get extension name
   */
  getName() {}

  accept(offers) {}
}

export default Extension;
