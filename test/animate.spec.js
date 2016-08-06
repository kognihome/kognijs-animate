"use strict";
var Animate = require('../src/animate');

describe("Animate Factory", function () {
    it('should respond to GET',function(done) {
      Animate.createElement('base/examples/data/step01.svg', {id:'foo'}, function(animation){
        done();
      });
    });
  it('should just pass',function(done) {
    done();
  });
});
