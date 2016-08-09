"use strict";

var Animate = require('../src/animate');
var defaultConfig;

describe("Projection Factory", function () {

  beforeEach(function(){
    defaultConfig = {
      matrix: "1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1",
      surface: { width: 100, height: 100, origin: { x: 0.5, y: 0.5 }},
      screen: {width: 100, height: 100}
    };
    var parentHTML = '<div id="parent"></div>';
    document.body.insertAdjacentHTML(
      'afterbegin',
      parentHTML
    );
  });

  it('should throw due to incomplete configurations', function () {
    expect(function(){Animate.createProjection()}).to.throw(Error);
    expect(function(){Animate.createProjection('parent')}).to.throw(Error);
    expect(function(){Animate.createProjection('parent', {})}).to.throw(Error);
    expect(function(){Animate.createProjection('parent', {
      surface: {width: 100, height: 100, origin: { x: 0.5, y: 0.5 }}})}).to.throw(Error);
    expect(function(){Animate.createProjection('parent', {
      screen: {width: 600, height: 600}})}).to.throw(Error);
  });

  it('should create a calibration view', function() {
    delete defaultConfig.matrix;
    Animate.createProjection('parent', defaultConfig);
  });

  it('should create a calibrated view', function() {
    var proj = Animate.createProjection('parent', defaultConfig);
    proj.showCoords();
  });
});

