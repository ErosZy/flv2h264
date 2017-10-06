const fs = require('fs');
const FLV2H264 = require('../index');

start();

function start() {
  let fd = fs.openSync('../videos/sample.flv', 'r');
  let stat = fs.fstatSync(fd);
  let buf = Buffer.alloc(stat.size);
  fs.readSync(fd, buf, 0, stat.size);

  let audios = [];
  let videos = [];
  let flv2h264 = new FLV2H264();

  flv2h264.on('audio:nalus', data => {
    audios.push(data.data);
  });

  flv2h264.on('video:nalus', data => {
    videos.push(data.data);
  });

  flv2h264.on('video:complete', () => {
    fs.writeFileSync('../videos/sample.acc', Buffer.concat(audios));
    fs.writeFileSync('../videos/sample.h264', Buffer.concat(videos));
    console.log('test success, you can find file in videos/sample.acc');
  });

  flv2h264.decode(buf);
}
