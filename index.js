var app = require('express')();
const path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const redis = require("redis");
const client = redis.createClient();
var logging = [];

client.on("error", function(error) {
  console.error(error);
});

app.get('/', (req, res) => {
  var logHtml = '';

  logging.forEach((v) => {
    logHtml += `<li>${v}</li>`;
  })

  const currentCounter = Object.keys(io.sockets.connected).length;
  client.SCARD('unique_install', (err, x) => {
    res.send(`<html><head><title>CC</title></head><h1>NOW : ${currentCounter} / INSTALLED(U) : ${x}</h1><ul>${logHtml}</ul></html>`);
  })
});

app.all("*", (req, res) => {
    res.sendStatus(404);
})

io.on('connect', (soc) => {
    soc['uid'] = "unknown";
    soc.on('start', (data) => {
      try {
        soc['uid'] = data.uid;
      }catch(e){}

      if (data.machine_id){
        client.SADD("unique_install", data.machine_id)
      }

      logging.unshift(`${(new Date()).toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})}: <b>[----------]</b> ${JSON.stringify(data)}`);

      if (logging.length > 1000) {
        logging.pop();
      }
    });

    soc.on('disconnect', () => {
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
      logging.unshift(`${(new Date()).toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})}: <b>[${soc['uid']}]</b> <span style="color:blue">OK: ${data}</span>`);
      if (logging.length > 1000) {
        logging.pop();
      }
    })
});

http.listen(8080, () => {
  console.log('listening on *:8080');
});
