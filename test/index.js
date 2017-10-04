const fs = require('fs');
const FLV2H264 = require('../index');

start();

function start() {
  let fd = fs.openSync('../videos/sample.flv', 'r');
  let stat = fs.fstatSync(fd);
  let buf = Buffer.alloc(stat.size);
  fs.readSync(fd, buf, 0, stat.size);

  let tmp = [];
  let flv2h264 = new FLV2H264();

  flv2h264.on('video:nalus', data => {
    tmp.push(data.data);
  });

  flv2h264.on('complete', () => {
    fs.writeFileSync('../videos/sample.h264', Buffer.concat(tmp));
    console.log('test success, you can find file in videos/sample.h264');
  });

  flv2h264.decode(buf);
}
