import EventEmitter from 'events';
import Receiver from './Receiver';
import Sender from './Sender';

import { states, CLOSE_TIMEOUT, EMPTY_BUFFER } from '../constants';

export default class WebSocket extends EventEmitter {
  constructor(maxPayload) {
    super();

    this.state = states.CONNECTING;
    this.receivedCloseFrame = false;
    this.maxPayload = maxPayload;
  }

  get extensions() {
    return this._extensions.values();
  }

  start(socket, extensions) {
    const receiver = new Receiver(extensions, this.maxPayload);

    this.sender = new Sender(this.socket);
    this.receiver = receiver;
    this.socket = socket;
    this._extensions = extensions;

    // Attach all the internal listeners
    const onReceiverFinish = data => {
      this.emit('message', data);
    };

    const onSocketData = this.addSocketListeners(onReceiverFinish);
    this.addReceiverListeners(onSocketData, onReceiverFinish);
  }

  addSocketListeners(receiverOnFinish) {
    const { socket, receiver } = this;

    const onData = buffer => {
      if (!receiver.write(buffer)) {
        socket.pause();
      }
    };

    const onEnd = () => {
      this.state = states.CLOSING;
      receiver.end();
      this.end();
    };

    const onClose = () => {
      socket.removeListener('close', onClose);
      socket.removeListener('data', onData);
      socket.removeListener('end', onEnd);

      this.state = states.CLOSING;
      receiver.end();

      clearTimeout(this.closeTimer);

      const { _writableState: { finished, errorEmitted } } = receiver;

      if (finished || errorEmitted) {
        this.emitClose();
      } else {
        receiver.on('error', receiverOnFinish);
        receiver.on('finish', receiverOnFinish);
      }
    };

    const onError = () => {
      socket.removeListener('error', onError);
      socket.on('error', () => {});

      this.state = states.CLOSING;
      socket.destroy();
    };

    socket.on('close', onClose);
    socket.on('data', onData);
    socket.on('end', onEnd);
    socket.on('error', onError);

    return onData;
  }

  addReceiverListeners(socketOnData, onFinish) {
    const { socket, receiver } = this;

    receiver.on('conclude', (code, reason) => {
      socket.removeListener('data', socketOnData);
      socket.resume();

      this.receivedCloseFrame = true;
      this.closeMessage = reason;
      this.closeCode = code;

      if (code === 1005) {
        this.close();
      } else {
        this.close(code, reason);
      }
    });

    receiver.on('drain', () => {
      socket.resume();
    });

    receiver.on('error', err => {
      this.state = states.CLOSING;

      this.closeCode = 'Unknown'; // TODO Create lookup table
      this.emit('error', err);
      socket.destroy();
    });

    receiver.on('finish', onFinish);

    receiver.on('ping', data => {
      this.pong(data);
      this.emit('ping', data);
    });

    receiver.on('pong', data => {
      this.emit('pong', data);
    });
  }

  emitClose() {
    const { socket, closeCode, closeMessage } = this;
    this.state = states.CLOSED;

    if (socket) {
      for (const extension of this.extensions) {
        extension.cleanup();
      }
    }

    this.emit('close', closeCode, closeMessage);
  }

  /**
   * Start a closing handshake
   * @param {Number} code Status code explaining why the connection is closing
   * @param {String} data Message explaining why the connection is closing
   */
  close(code, data) {
    const { state, sender, socket, sentCloseFrame, receivedCloseFrame } = this;

    if (state === states.CLOSED) {
      return;
    }

    if (state === states.CONNECTING) {
      // TODO Fix
      return;
      /*return abortHandshake(
        this,
        'WebSocket was closed before connection was established'
      );*/
    }

    if (state === states.CLOSING) {
      if (sentCloseFrame && receivedCloseFrame) {
        return socket.end();
      }
    }

    this.state = states.CLOSING;

    sender.close(code, data, err => {
      // Error handled by the socket
      if (err) return;

      this.sentCloseFrame = true;

      if (socket.writable) {
        if (this.receivedCloseFrame) {
          socket.end();
        }
      }

      // Ensure connection is closed even if the handshake fails
      this.closeTimer = setTimeout(socket.destroy.bind(socket), CLOSE_TIMEOUT);
    });
  }

  /**
   * Sends a ping frame
   * @param {*} data The data to send
   * @param {Function} callback Executed when the ping is sent
   */
  ping(data, callback) {
    if (!this._verifyOpen(callback)) {
      return;
    }

    this.sender.ping(data || EMPTY_BUFFER, callback);
  }

  /**
   * Sends a pong frame
   * @param {*} data The data to send
   * @param {Function} callback Execute when the pong is sent
   */
  pong(data, callback) {
    if (!this._verifyOpen(callback)) {
      return;
    }

    this.sender.pong(data, callback);
  }

  /**
   * Sends a data message
   * @param {*} data The message to send
   * @param {Object} options Options object
   * @param {Boolean} options.compress Whether or not to compress data.
   * @param {Boolean} options.binary Whether data is binary or text.
   * @param {Boolean} options.fin Whether the fragment is the last one.
   * @param {Function} callback Executed when data is written out.
   */
  send(data, options = {}, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (!this._verifyOpen(callback)) {
      return;
    }

    if (options.compress) {
      throw new Error('Unsupported operation: not implemented yet');
    }

    this.sender.send(data || EMPTY_BUFFER, {
      binary: typeof data !== 'string',
      fin: true,
      ...options
    });
  }

  _verifyOpen(callback) {
    const { state } = this;

    if (state === states.OPEN) {
      return true;
    }

    const err = new Error(
      `WebSocket connection is not open, state is ${state}`
    );

    if (callback) {
      callback(err);
      return;
    }

    throw err;
  }
}
