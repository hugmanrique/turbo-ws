import Receiver from './Receiver';
import Sender from './Sender';

export function inject(socket, maxPayload) {
  socket.receiver = new Receiver(maxPayload);
  socket.sender = new Sender(socket);

  // TODO Listen for events
}
