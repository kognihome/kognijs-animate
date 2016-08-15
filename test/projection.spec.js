"use strict";

var Animate = require('../src/animate');
var defaultConfig;

function Dummy() {
  this.resetStub = sinon.stub();
  this.updateStub = sinon.stub();
}

Dummy.prototype.reset = function() {
  return this.resetStub();
};

Dummy.prototype.update = function(data) {
  return this.updateStub();
};

describe("Projection Factory", function () {

  before(function(){
    window.localStorage.removeItem('matrix');
  });

  beforeEach(function(){
    defaultConfig = {
      matrix: "1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1",
      surface: { width: 100, height: 100, origin: { x: 0.5, y: 0.5 }},
      screen: {width: 100, height: 100}
    };
    document.body.innerHTML = '';
    var parentHTML = '<div id="parent"></div>';
    document.body.insertAdjacentHTML(
      'afterbegin',
      parentHTML
    );
  });

  afterEach(function() {
    document.body.innerHTML = '';
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
    // click to set box somewhere
    var mEvent = new MouseEvent('dblclick', {
      view: window,
      bubbles: true,
      cancelable: true,
      pageX: 100,
      pageY: 100,
    });
    document.body.dispatchEvent(mEvent);

    var kArrowLeft = new KeyboardEvent('keydown', {keyCode: 37, bubbles : true, cancelable : true });
    var kArrowUp = new KeyboardEvent('keydown', {keyCode: 38, bubbles : true, cancelable : true });
    var kArrowRight = new KeyboardEvent('keydown', {keyCode: 39, bubbles : true, cancelable : true });
    var kArrowDown = new KeyboardEvent('keydown', {keyCode: 40, bubbles : true, cancelable : true });
    var kSpace = new KeyboardEvent('keydown', {keyCode: 32, bubbles : true, cancelable : true });

    document.body.dispatchEvent(kArrowLeft);
    document.body.dispatchEvent(kArrowUp);
    document.body.dispatchEvent(kArrowRight);
    document.body.dispatchEvent(kArrowDown);
    document.body.dispatchEvent(kSpace);
  });

  it('should create a calibrated view', function() {
    var proj = Animate.createProjection('parent', defaultConfig);
    proj.showCoords();
  });

  it('should save a calibration result', function() {
    delete defaultConfig.matrix;
    var p = Animate.createProjection('parent', defaultConfig);
    var kSave = new KeyboardEvent('keydown', {keyCode: 83, bubbles : true, cancelable : true });
    document.body.dispatchEvent(kSave);
  });

  it('should load a calibration result', function() {
    defaultConfig.preferCachedMatrix = true;
    var p = Animate.createProjection('parent', defaultConfig);
  });

  it('should add a Widget', function () {
    var p = Animate.createProjection('parent', defaultConfig);
    var d = new Dummy();
    p.addWidget(d);
    expect(d.updateStub.called).to.be.false;
    expect(d.resetStub.called).to.be.true;
    d.update();
    expect(d.updateStub.called).to.be.true;
    p.resetWidgets();
    expect(d.resetStub.calledTwice).to.be.true;
  })

  it('should add a Widget', function () {
    var p = Animate.createProjection('parent', defaultConfig);
    var d = new Dummy();
    p.addWidget(d);
    expect(d.updateStub.called).to.be.false;
    expect(d.resetStub.called).to.be.true;
    d.update();
    expect(d.updateStub.called).to.be.true;
    p.resetWidgets();
    expect(d.resetStub.calledTwice).to.be.true;
  })
});

