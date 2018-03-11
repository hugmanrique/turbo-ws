import BinaryStream from '../src/binaryStream';

describe('BinaryStreams', () => {
  let stream;

  test('allocation from buffer', () => {
    const buf = Buffer.allocUnsafe(10);

    stream = new BinaryStream(buf);
  });

  test('data gets added', done => {
    const buf = Buffer.allocUnsafe(10);

    stream.on('data', notified => {
      expect(notified).toEqual(buf);
      done();
    });

    stream.addData(buf);
  });

  test('calls end event', done => {
    stream.on('end', () => {
      done();
    });

    stream.end();
  });
});
