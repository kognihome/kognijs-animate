var Animate = require("./animate");
var log = require('loglevel');

log.setLevel('debug');

if (!global.KogniJS) {global.KogniJS = {}}
KogniJS.Animate = Animate;
