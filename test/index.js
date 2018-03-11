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

    it('should complete the listen Promise', done => {
      // Port 0 will find a port automatically for us
      server.listen(0).then(() => {
        done();
      });
    });
  });

  describe('connections', () => {
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
            server.removeAllListeners('connection');

            res();
          });
        })
      ]);
    });

    test('server receives the client message', () => {
      const testMessage = 'test message';

      return new Promise(res => {
        socket.on('text', message => {
          expect(message).toBe(testMessage);

          socket.removeAllListeners('text');
          res();
        });

        ws.send(testMessage);
      });
    });

    /*test('server handles disconnect', () => {
      expect.assertions(1);
      ws.terminate();

      socket.on('close', callExpect);
    });*/
  });
});
