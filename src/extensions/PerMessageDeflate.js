import Extension from '../Extension';
//import { states } from '../socket/Receiver';

export default class PerMessageDeflate extends Extension {
  constructor() {
    throw new Error('Not supported yet');
  }

  getName() {
    return 'permessage-deflate';
  }

  /*accept(offers) {}

  processData(/*receiver, data, callback) {
    throw new Error('Not supported yet');

    if (this.compressed) {
      receiver.state = states.INFLATING;
      // TODO Decompress and call callback
      return true;
    }
  }*/
}
