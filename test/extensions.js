import Extension, {
  handleNegotiation,
  serializeExtensions
} from '../src/Extension';

class DummyExtension extends Extension {
  static get name() {
    return 'Dummy';
  }

  static accept(offers) {
    // Always return the first one
    return offers[0];
  }
}

const mockServer = {
  options: {
    maxPayload: 100 * 1024 * 1024
  },
  extensions: []
};

function buildReq(returnOffer) {
  return {
    getHeader() {
      return returnOffer;
    }
  };
}

describe('extensions', () => {
  describe('negotiation', () => {
    it("should skip extension check if server doesn't have extensions", () => {
      const socket = {};

      handleNegotiation(mockServer, socket, buildReq('Dummy'));

      expect(socket.extensions).toBeUndefined();
    });

    it('should handle basic negotiation', () => {
      mockServer.extensions = [DummyExtension];
      const socket = {};

      const err = handleNegotiation(mockServer, socket, buildReq('Dummy'));

      expect(err).toBeUndefined();
      expect(socket.extensions).toBeDefined();
      expect(socket.extensions.has('Dummy')).toBe(true);

      const instance = socket.extensions.get('Dummy');
      expect(instance.constructor).toBe(DummyExtension);
      expect(instance.maxPayload).toBe(mockServer.options.maxPayload);
    });

    it('should handle multiple offers', () => {
      const socket = {};

      handleNegotiation(mockServer, socket, buildReq('Dummy; value=1, Dummy'));

      expect(socket.extensions.has('Dummy')).toBe(true);

      const instance = socket.extensions.get('Dummy');
      expect(instance.options).toEqual({ value: 1 });
    });

    it('should ignore not supported offer', () => {
      const socket = {};

      handleNegotiation(mockServer, socket, buildReq('NotSupported'));

      expect(socket.extensions.has('Dummy2')).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize single extension', () => {
      expect(serializeWrap(['Dummy', new DummyExtension()])).toBe('Dummy');
    });

    it('should serialize extension with params', () => {
      const ext = new DummyExtension({ value: 1 });

      expect(serializeWrap(['Dummy', ext])).toBe('Dummy; value=1');
    });

    it('should serialize multiple extensions', () => {
      expect(
        serializeWrap(
          ['Dummy', new DummyExtension()],
          ['Dummy2', new DummyExtension()]
        )
      ).toBe('Dummy, Dummy2');
    });

    it('should serialize multiple extensions with params', () => {
      const ext = new DummyExtension({ value: 'str' });

      expect(
        serializeWrap(['Dummy', ext], ['Dummy2', new DummyExtension()])
      ).toBe('Dummy; value=str, Dummy2');
    });
  });
});

function serializeWrap() {
  return serializeExtensions(new Map(arguments));
}
