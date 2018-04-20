import Receiver from './Receiver';
import Sender from './Sender';

export function inject({ extensions, ...socket }, maxPayload) {
  socket.receiver = new Receiver(maxPayload, extensions);
  socket.sender = new Sender(socket);

  // TODO Listen for events
}
