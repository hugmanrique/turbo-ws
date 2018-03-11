import WebSocket from 'ws';
import Server from '../src/index';

let server;
let ws;
let socket;

describe('turbo-ws', () => {
  describe('server', () => {
    it('should create instance without errors', () => {
      server = new Server();
    });

    it('should resolve the listen Promise', done => {
      // Port 0 will find a port automatically for us
      server.listen(0).then(done);
    });
  });

  describe('connections', () => {
    afterEach(() => {
      server.removeAllListeners();
      socket.removeAllListeners();
      ws.removeAllListeners();
    });

    test('client connects succesfully', () => {
      const { address, port } = server.server.address();
      ws = new WebSocket(`ws://${address}:${port}`);

      return Promise.all([
        new Promise((res, rej) => {
          ws.on('open', res);
          ws.on('error', rej);
        }),
        new Promise(res => {
          server.on('connection', socketObj => {
            socket = socketObj;
            res();
          });
        })
      ]);
    });

    const testMessage = 'test message';

    test('server receives text frame', done => {
      expect.assertions(1);

      socket.on('text', message => {
        expect(message).toBe(testMessage);
        done();
      });

      ws.send(testMessage);
    });

    test('client receives text frame', done => {
      expect.assertions(1);

      ws.on('message', message => {
        expect(message).toBe(testMessage);
        done();
      });

      socket.send(testMessage);
    });

    test('client receives binary frame', done => {
      expect.assertions(1);
      const testBuf = Buffer.allocUnsafe(4);

      ws.on('message', buf => {
        expect(buf).toEqual(testBuf);
        done();
      });

      socket.send(testBuf);
    });

    // FIXME: For some reason ws doesn't send ping frames
    /*test('server pongs', done => {
      expect.assertions(1);

      socket.on('ping', payload => {
        expect(payload).toBe(testMessage);
        done();
      });

      ws.ping(testMessage);
    });*/

    test('client receives ping', done => {
      expect.assertions(1);

      ws.on('ping', payload => {
        expect(payload.toString()).toBe(testMessage);
        done();
      });

      socket.ping(testMessage);
    });

    test('server handles disconnect', done => {
      socket.on('close', () => {
        done();
      });

      ws.terminate();
    });
  });
});
