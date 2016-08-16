"use strict";
var Animate = require('../src/animate');

describe("Animate Factory", function () {
  it('should ceate an element from path', function(done) {
    Animate.createElement('base/examples/data/step01.svg', {id:'foo'}, function(err, animation){
      expect(function(){Animate.createElement()}).to.throw(Error);
      expect(function(){Animate.createElement(undefined, {}, undefined)}).to.throw(Error);
      expect(function(){Animate.loadElement()}).to.throw(Error);
      expect(function(){Animate.loadElement(undefined, {}, undefined)}).to.throw(Error);
      done(err);
    });
  });

  it('should create and element from SVG string', function(done) {
    Animate.createElement('<svg><g id="import"><rect x="100" y="10" width="95" height="60"  /></g></svg>',
      {id:'foo'}, function(err, animation){
        done(err);
      });
  });

  it('should create and element from SVG string', function(done) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('version', '1.1');
    var group = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    group.setAttribute('id', 'import');
    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '30');
    rect.setAttribute('height', '40');
    rect.setAttribute('fill', 'black');
    group.appendChild(rect);
    svg.appendChild(group);
    Animate.createElement(svg,
      {id:'foo'}, function(err, animation){
      done(err);
    });
  });

  it('should return error since there is no import group', function(done) {
    Animate.createElement('<svg><rect x="100" y="10" width="95" height="60"  /></svg>',
      {id:'foo'}, function(err, animation){
        expect(err).to.be.an('error');
        done();
    });
  });

  it('should ceate an element from XML',function(done) {
    Animate.createElement('base/examples/data/step07.xml', {id:'foo'}, function(err, animation){
      animation.set('time', '12:12');
      done(err);
    });
  });

  it('should create an element from XML with loops', function (done) {
      Animate.createElement('base/examples/data/step02.xml', {id: 'bar'}, function (err, animation) {
        done(err);
      });
  });

  it('should create an element from XML with defs', function (done) {
    Animate.createElement('base/examples/data/blackwhite.xml', {id: 'baz'}, function (err, animation) {
      done(err);
    });
  });

  it('should create an element for parent', function (done) {
    var parentHTML = '<div id="parent"></div>';
    document.body.insertAdjacentHTML(
      'afterbegin',
      parentHTML
    );
    Animate.createElement('base/examples/data/step01.svg', {parent:'parent'}, function(animation){
      done();
    });
  });

  it('should control animation loops', function (done) {
      Animate.createElement('base/examples/data/step07.xml', {id: 'bar'}, function (err, animation) {
        expect(err).to.be.a('null');
        animation.stop();
        animation.resume();
        animation.stop();
        animation.start();
        animation.moveTo(0,0);
        animation.align('time', 'begin');
        animation.align('time', 'start');
        animation.align('time', 'end');
        animation.align('time', 'start');
        animation.align('time', 'middle');
        animation.align('time', 'end');
        animation.align('time', 'middle');
        animation.align('time', 'middle');
        done();
      });
  });

  it('should loop animation', function (done) {
    var params = {parent:'foo', loops:[{element:'circle', path:'circlePath', duration:200}]};
    Animate.createElement('base/examples/data/step02.svg', params, function (err, animation) {
      expect(err).to.be.a('null');
      setTimeout(function() {done()}, 500);
    });
  });

  it('should stop animation', function (done) {
    var params = {parent:'foo', loops:[{element:'circle', path:'circlePath', duration:200}]};
    Animate.createElement('base/examples/data/step02.svg', params, function (err, animation) {
      expect(err).to.be.a('null');
      animation.stop();
      animation.start(null, {looped: false});
      setTimeout(function() {
        done()
      }, 500);
    });
  });
});
