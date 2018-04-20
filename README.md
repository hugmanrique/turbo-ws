# :dash: turbo-ws

[![npm][npm]][npm-url]
[![node][node]][node-url]
[![deps][deps]][deps-url]
[![tests][tests]][tests-url]
[![coverage][cover]][cover-url]
[![license][license]][license-url]

A blazing fast low-level WebSocket server based on [turbo-net](https://github.com/mafintosh/turbo-net) and the awesome [ws](https://github.com/websockets/ws) server library for Node.js

## Features

* Supports thousands of concurrent connections with minimal CPU and RAM impact.
* Binary and text frames are supported. That means you can directly send Node's `Buffer`s or `String`s if you prefer.
* Built with reliability in mind.

## Getting Started

Install turbo-ws using [`npm`](https://www.npmjs.com/):

```bash
npm install --save @hugmanrique/turbo-ws
```

Or via [`yarn`](https://yarnpkg.com/en/package/@hugmanrique/turbo-ws):

```bash
yarn add @hugmanrique/turbo-ws
```

The minimum supported Node version is `v8.10.0`.

Let's get started by creating a WebSocket server:

```javascript
import Server from '@hugmanrique/turbo-ws';

const server = new Server();
const port = 80;
```

Then, add a `'connection'` listener. The callback will contain a [`Connection`](https://github.com/mafintosh/turbo-net#connectiononconnect) and a [`Request`](https://github.com/mafintosh/turbo-http#requrl) object:

```javascript
server.on('connection', (connection, req) => {
  const userAgent = req.getHeader('User-Agent');

  console.log(`Using ${userAgent} browser`);
  connection.send('Hello world!');
});
```

Finally call the `#listen(port)` method and run your Node app:

```javascript
server.listen(port).then(() => {
  console.log(`Listening on *:${port}`);
});
```

## Methods

#### `connection.send(data)`

Sends data to the client. Depending on the type of the passed object, it will send the data in one or multiple frames:

* Strings get sent directly in one frame.
* Objects get converted to strings through `JSON.stringify`.
* Node's [Buffers](https://nodejs.org/api/buffer.html) get sent as binary data and may be sent in multiple frames.

#### `connection.ping([payload])`

Sends a ping frame that may contain a payload. The client must send a Pong frame with the same payload in response. Check the [`connection.on('pong')`](#connectiononpong) method for more details.

#### `connection.close([callback])`

Closes the connection.

#### `server.broadcast(data)`

Sends data to all the clients. Follows the same logic as [`connection.send(data)`](#connectionsenddata)

#### `server.getConnections()`

Get an unordered array containing the current active [connections](https://github.com/mafintosh/turbo-net#connectiononconnect).

#### `server.close()`

Closes the server. Returns a `Promise` that will get completed when all the connections are closed.

## Events

Both the `Server` and the `Connection` are [EventEmitters](https://nodejs.org/api/events.html#events_class_eventemitter), so you can listen to these events:

#### `server.on('connection', connection)`

Emitted when a new connection is established. The callback arguments are `connection, request`, where the first is a turbo-net [Connection](https://github.com/mafintosh/turbo-net#connectiononconnect) and the later is a turbo-http [Request](https://github.com/mafintosh/turbo-http#requrl) object. Check out their docs to see what fields and methods are available.

#### `server.on('close')`

Emitted when the server has terminated all the WebSocket connections and it is going to die.

#### `connection.on('text', string)`

Emitted when the client sends some text data.

#### `connection.on('binary', binaryStream)`

Emitted when the client sends some buffered binary data. Returns a [BinaryStream](src/binaryStream.js), which is a wrapper for Node's [`stream.Readable`](https://nodejs.org/api/stream.html#stream_readable_streams). You can then add listeners to the stream:

```javascript
const writable = fs.createWriteStream('file.txt');

connection.on('binary', stream => {
  stream.pipe(writable);

  stream.on('end', () => {
    console.log('Saved client logs to disk!');
  });
});
```

#### `connection.on('ping')`

Emitted when the server received a [Ping frame](https://tools.ietf.org/html/rfc6455#section-5.5.2) from the client.

#### `connection.on('pong')`

Emitted when the server received a [Pong frame](https://tools.ietf.org/html/rfc6455#section-5.5.3) from the client.

#### `connection.on('close')`

Emitted when a connection is fully closed. No other events will be emitted after.

# License

[MIT](LICENSE) &copy; [Hugo Manrique](https://hugmanrique.me)

[npm]: https://img.shields.io/npm/v/@hugmanrique/turbo-ws.svg
[npm-url]: https://npmjs.com/package/@hugmanrique/turbo-ws
[node]: https://img.shields.io/node/v/@hugmanrique/turbo-ws.svg
[node-url]: https://nodejs.org
[deps]: https://img.shields.io/david/hugmanrique/turbo-ws.svg
[deps-url]: https://david-dm.org/hugmanrique/turbo-ws
[tests]: https://img.shields.io/travis/hugmanrique/turbo-ws/master.svg
[tests-url]: https://travis-ci.org/hugmanrique/turbo-ws
[license-url]: LICENSE
[license]: https://img.shields.io/github/license/hugmanrique/turbo-ws.svg
[cover]: https://img.shields.io/coveralls/hugmanrique/turbo-ws.svg
[cover-url]: https://coveralls.io/r/hugmanrique/turbo-ws/
