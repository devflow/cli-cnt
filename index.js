var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var currentCounter = 0;
var logging = [];

app.get('/', (req, res) => {
  var logHtml = '';

  logging.forEach((v) => {
    logHtml += `<li>${v}</li>`;
  })

  res.send(`<html><head><title>CC</title></head><h1>${currentCounter}</h1><ul>${logHtml}</ul></html>`);
});

app.all("*", (req, res) => {
    res.sendStatus(404);
})

io.on('connect', (soc) => {
    currentCounter++;

    soc['uid'] = "unknown";

    soc.on('start', (data) => {
      try {
        soc['uid'] = data.uid;
      }catch(e){}

      logging.unshift(`${(new Date()).toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})}: <b>[----------]</b> ${JSON.stringify(data)}`);

      if (logging.length > 1000) {
        logging.pop();
      }
    });

    soc.on('disconnect', () => {
        currentCounter--;
        logging.unshift(`${(new Date()).toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})}: <b>[${soc['uid']}]</b> DISCONNECTED`);

        if (logging.length > 1000) {
          logging.pop();
        }
    });

    soc.on('fcm-error', (data) => {
      logging.unshift(`${(new Date()).toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})}: <b>[${soc['uid']}]</b> FCM ERROR <p style="color:red">${data}</p>`);

      if (logging.length > 1000) {
        logging.pop();
      }
    })

    soc.on('fcm-token', (data) => {
      logging.unshift(`${(new Date()).toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})}: <b>[${soc['uid']}]</b> <p style="color:blue">OK: ${data}</p>`);

      if (logging.length > 1000) {
        logging.pop();
      }
    })
});

http.listen(8080, () => {
  console.log('listening on *:8080');
});
