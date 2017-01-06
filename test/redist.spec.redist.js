"use strict";

describe("Redist Test", function () {

  before(function(){
    document.body.innerHTML = '';
    var scriptTag = '<script src="base/redist/kognijs.animate.min.js"></script>';
    document.body.insertAdjacentHTML(
      'afterbegin',
      scriptTag
    );
  });

  it('should have loaded KogniJS-Animate from CDN', function (done) {
    expect(KogniJS).to.not.be.an('undefined');
    done();
  });

  it('should have KogniJS.Animate', function (done) {
    expect(KogniJS.Animate).to.not.be.an('undefined');
    done();
  });

  it('should have a createElement function', function (done) {
    expect(KogniJS.Animate.createElement).to.be.a('function');
    done();
  });

  it('should have a createElement function', function (done) {
    expect(function(){KogniJS.Animate.createProjection()}).to.throw(Error);
    done();
  });

});


