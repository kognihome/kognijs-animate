"use strict";
var Animate = require('../src/animate');
var AnimationWidget = require('../src/animationwidget');

var defaultConfig = {
  parent: "parent",
  matrix: "1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1",
  surface: { width: 100, height: 100, origin: { x: 0.5, y: 0.5 }},
  screen: {width: 100, height: 100}
};

// See http://docs.cor-lab.org/rst-manual/0.14/html/generated/stable/package-rst-geometry.html#rst.geometry.AxisAlignedBoundingBox3DFloat
// for reference
var objectId = {type:'object', id: '1'};
var objectPosition = {x: 0.0, y: 0.0};
var objectBox = {
  width: 1.0,
  depth: 1.0,
  left_front_bottom: objectPosition
};
var labeledObject = {object_id: objectId, box: objectBox, time:"11:11"};
var testWithBox = {object_reference: {object: labeledObject}, time:"11:12"};
var testWithId = {object_reference: {object_id: objectId}, progress: 0.123423432};
var testWithPos = {object_reference: {pos: objectPosition}, progress: 5.3134324};
var testWithPosFallback = {object_reference: {object_id: {type: objectId.type, id: '2'}, pos: objectPosition}};

var trackingResult = [labeledObject];

var parentHTML = '<div id="parent"></div>';
var animationSVG = '<svg><g id="import"><text id="time" x="0" y="0">Test</text>' +
                   '<text id="progress" x="0" y="0">0.0</text>'+
                   '<rect x="100" y="10" width="95" height="60"  /></g></svg>';
var params = {id: 'foo', map: {time:['time'], progress:['progress']}};
var projection;

describe("AnimationWidget", function () {

  beforeEach(function(){
    document.body.innerHTML = '';
    document.body.insertAdjacentHTML(
      'afterbegin',
      parentHTML
    );
    projection = Animate.createProjection(defaultConfig);
    params.projection = projection;
  });

  it('should just create a widget', function (done) {
    expect(function() {new AnimationWidget()}).to.throw(Error);
    expect(function() {new AnimationWidget(undefined, {id: 'foo'})}).to.throw(Error);
    expect(function() {new AnimationWidget(undefined, {projection: projection})}).to.throw(Error);
    expect(function() {new AnimationWidget(undefined, {parent: 'bar', projection: projection})}).to.throw(Error);
    new AnimationWidget(animationSVG, {id: 'foo', projection: projection}, function(err, anim) {
      done(err);
    });
  });

  it('should update a widget with box', function (done) {
    params.resolveObjectReference = true;
    params.moveToReference = true;
    new AnimationWidget(animationSVG, params, function(err, anim) {
      anim.update(testWithBox);
      done();
    });
  });

  it('should update a widget with pos', function (done) {
    params.resolveObjectReference = true;
    params.moveToReference = true;
    new AnimationWidget(animationSVG, params, function(err, anim) {
      anim.update(testWithPos);
      done();
    });
  });

  it('should update a widget with pos due to wrong ID', function (done) {
    params.resolveObjectReference = true;
    params.moveToReference = true;
    new AnimationWidget(animationSVG, params, function(err, anim) {
      projection.model.detection = {objects: trackingResult};
      anim.update(testWithPosFallback);
      done();
    });
  });

  it('should NOT update a widget with ID', function (done) {
    params.resolveObjectReference = true;
    params.moveToReference = true;
    new AnimationWidget(animationSVG, params, function(err, anim) {
      projection.model.detection = {objects: []};
      anim.update(testWithId);
      done();
    });
  });

  it('should update a widget with ID', function (done) {
    params.resolveObjectReference = true;
    params.moveToReference = true;
    new AnimationWidget(animationSVG, params, function(err, anim) {
      projection.model.detection = {objects: trackingResult};
      anim.update(testWithId);
      done();
    });
  });

  it('should update a widget with timeout', function (done) {
    params.timeout = 100;
    new AnimationWidget(animationSVG, params, function(err, anim) {
      anim.update(testWithPos);
      setTimeout(function(){done()}, 200);
    });
  });
});

