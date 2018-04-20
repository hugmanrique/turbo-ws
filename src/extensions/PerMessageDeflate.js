import Extension from '../Extension';
//import { states } from '../socket/Receiver';

export default class PerMessageDeflate extends Extension {
  constructor() {
    throw new Error('Not supported yet');
  }

  static get name() {
    return 'permessage-deflate';
  }

  /*static accept(offers) {}

  processData(/*receiver, data, callback) {
    throw new Error('Not supported yet');

    if (this.compressed) {
      receiver.state = states.INFLATING;
      // TODO Decompress and call callback
      return true;
    }
  }*/
}
