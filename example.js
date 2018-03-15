const Server = require('./dist/').default;

const port = 5000;
const server = new Server();

/* eslint-disable no-console */

server.listen(port).then(() => {
  console.log(`⚡ Listening on *:${port}`);
});

server.on('connection', socket => {
  socket.send('message');

  socket.on('text', message => {
    console.log(`Client says "${message}"`);
  });
});

server.on('request', (req, res) => {
  res.end(`hello to ${req.url}`);
});
