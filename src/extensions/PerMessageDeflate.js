import Extension from '../Extension';
import { states } from '../socket/Receiver';

class PerMessageDeflate extends Extension {
  // TODO
  //name = ''

  getName() {
    return '';
  }

  accept(offers) {}

  processData(receiver, data, callback) {
    if (this.compressed) {
      receiver.state = states.INFLATING;
      // TODO Decompress and call callback
      return true;
    }
  }
}
