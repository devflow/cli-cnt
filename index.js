var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var currentCounter = 0;

app.get('/', (req, res) => {
  res.send(`<html><head><title>CC</title></head><h1>${currentCounter}</h1></html>`);
});

app.all("*", (req, res) => {
    res.sendStatus(404);
})

io.on('connect', (soc) => {
    currentCounter++;

    soc.on('disconnect', () => {
        currentCounter--;
    })
});

http.listen(80, () => {
  console.log('listening on *:80');
});
