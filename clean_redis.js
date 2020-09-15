const Redis = require("ioredis");
const redis = new Redis();

redis.smembers("unique_install", (err, res) => {
    if (err) {
        console.error(err);
        return;
    }

    const execPipe = redis.pipeline()

    res.forEach((item) => {
        execPipe.sadd("win32_unique_install", item);
    })

    execPipe.exec((err) => {
        console.log(err)
    })
})