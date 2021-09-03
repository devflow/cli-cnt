var app = require("express")();
const path = require("path");
var http = require("http").createServer(app);
var io = require("socket.io")(http);
const Redis = require("ioredis");
const redis = new Redis();
var moment = require("moment");
var logging = [];
var resultChunk = {
  total: 0,
  current_win: 0,
  current_darwin: 0,
  installed_win: 0,
  installed_darwin: 0,
  real_total: 0,
  old_unique: 0,
  dayList: [],
  logList: logging,
  updated: new Date(),
};

redis.set("connected_win32_count", 0);
redis.set("connected_darwin_count", 0);

const updater = {
  common: () => {
    resultChunk.logList = logging;

    const pipe = redis.pipeline();
    pipe.get("connected_win32_count"); // 0
    pipe.get("connected_darwin_count");
    pipe.scard("win32_unique_install");
    pipe.scard("darwin_unique_install");
    pipe.scard("unique_install");
    pipe.exec((_, results) => {
      resultChunk.current_win = parseInt(results[0][1]);
      resultChunk.current_darwin = parseInt(results[1][1]);
      resultChunk.installed_win = parseInt(results[2][1]);
      resultChunk.installed_darwin = parseInt(results[3][1]);
      resultChunk.old_unique = parseInt(results[4][1]);
      resultChunk.total =
        parseInt(resultChunk.current_win) +
        parseInt(resultChunk.current_darwin);
      resultChunk.updated = new Date();
    });
  },

  updateDayListData: () => {
    const dayList = [],
      now = moment();
    const pipe = redis.pipeline();

    for (i of Array(60)) {
      pipe.get(`date_${now.format("YYYYMMDD")}`);
      pipe.scard(`date_${now.format("YYYYMMDD")}_unique`);

      dayList.push({
        day: now.format("YYYY-MM-DD"),
        count: 0,
        unique: 0,
      });

      now.subtract(1, "day");
    }

    pipe.exec((_, results) => {
      var tick = true;

      results.forEach((res, idx) => {
        if (tick) dayList[idx / 2].count = parseInt(res[1]);
        else dayList[(idx - 1) / 2].unique = parseInt(res[1]);

        tick = !tick;
      });

      resultChunk.dayList = dayList;
    });
  },
};

app.set("view engine", "pug");
app.get("/", (req, res) => {
  resultChunk.real_total = Object.keys(io.sockets.connected).length;
  res.render("index", resultChunk);
});

function addLog(msg) {
  logging.unshift(
    `<span class="time">${new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    })}</span>: ${msg}`
  );
  if (logging.length > 1000) {
    logging.pop();
  }
}

app.all("*", (req, res) => {
  res.sendStatus(404);
});

io.on("connect", (soc) => {
  soc["uid"] = "unknown";

  soc.on("start", (data) => {
    try {
      soc["uid"] = data.uid;
      soc["platform"] = data.platform;
    } catch (e) {}

    if (data.platform === "win32") {
      redis.incr("connected_win32_count");
      if (data.machine_id) {
        redis.sadd("win32_unique_install", data.machine_id);
      }
    } else if (data.platform === "darwin") {
      redis.incr("connected_darwin_count");
      if (data.machine_id) {
        redis.sadd("darwin_unique_install", data.machine_id);
      }
    }

    redis.incr("date_" + moment().format("YYYYMMDD"));
    redis.sadd("date_" + moment().format("YYYYMMDD") + "_unique", data.uid);

    addLog(`<b>[----------]</b> ${JSON.stringify(data)}`);
  });

  soc.on("disconnect", () => {
    addLog(`<b>[${soc["uid"]}]</b> DISCONNECTED`);

    if (soc.platform) {
      if (soc.platform === "darwin") {
        redis.decr("connected_darwin_count");
      } else if (soc.platform === "win32") {
        redis.decr("connected_win32_count");
      }
    }
  });

  soc.on("fcm-error", (data) => {
    addLog(`<b>[${soc["uid"]}]</b> FCM ERROR <p class="error">${data}</p>`);
  });

  soc.on("fcm-token", (data) => {
    addLog(`<b>[${soc["uid"]}]</b> <span class="ok">OK: ${data}</span>`);
  });
});

http.listen(8080, () => {
  console.log("listening on *:8080");
});

setInterval(() => {
  updater.common();
  updater.updateDayListData();
}, 10000);
