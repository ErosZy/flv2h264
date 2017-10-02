var getConfig = require('hjs-webpack');

let config = getConfig({
  in: 'index.js',
  out: 'build',
  clearBeforeBuild: true
});

let jsconf = config.module.rules[0];
delete jsconf.exclude;

module.exports = config;
