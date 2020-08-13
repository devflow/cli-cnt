var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/what', (req, res) => {
  res.send(`<html><head><title>CC</title></head><h1>${io.clients.length}</h1></html>`);
});

http.listen(6974, () => {
  console.log('listening on *:6974');
});
