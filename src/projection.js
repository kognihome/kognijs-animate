"use strict";

/**
 * Description
 * @method Projection
 * @param {} config
 * @return
 */
function Projection(config, model) {
  if (!config || !config.parent || !config.screen || !config.surface) {
    throw Error('Configuration incomplete. Should provide at least parent, surface and screen resolution.');
  }
  this.config = config;
  this.mapping = {};
  this.widgets = {};
  this.model = model || {};
  (this.config.matrix) ? this.loadCalibration(config.parent) : this.calibrate(config.parent);
}

Projection.ELEM = "<div id='container_{0}'>" +
  "<canvas id='projection_{0}' class='kogni-projection' width='{1}px' height='{2}px'></canvas>" +
  "<div id='overlay_{0}' class='kogni-overlay' style=\"width:{1}px; height:{2}px;\"></div>" +
  "</div>";

Projection.CALIB = " <div id=\"marker0\" class=\"calib-active calib-corner\">TL</div>" +
  " <div id=\"marker1\" class=\"calib-corner\">TR</div>" +
  " <div id=\"marker3\" class=\"calib-corner\">BL</div>" +
  " <div id=\"marker2\" class=\"calib-corner\">BR</div>";

Projection.prototype._init = function(target) {
  this.target = target;
  var template = document.createElement('template');
  template.innerHTML = Projection.ELEM.format(this.target, this.config.screen.width,
                                              this.mapping.screenHeight || this.config.screen.height);
  document.getElementById(target).appendChild(template.content.firstChild);

};

Projection.prototype.loadCalibration = function(target) {
  this.mapping.surfaceWidth = this.config.surface.width;
  this.mapping.surfaceHeight = this.config.surface.height;
  this.mapping.screenWidth = this.config.screen.width;
  this.mapping.screenHeight = Math.floor(this.mapping.screenWidth / this.mapping.surfaceWidth * this.mapping.surfaceHeight);
  this.mapping.offsetX = this.config.surface.origin.x *  this.mapping.screenWidth;
  this.mapping.offsetY = this.config.surface.origin.y * this.mapping.screenHeight;
  this._init(target);

  var proj = document.getElementById("projection_"+this.target);
  var over = document.getElementById("overlay_"+this.target);
  var t = this.config.matrix;
  var local = localStorage.getItem("matrix");
  if (this.config.preferCachedMatrix && local) {
    t = local;
  }
  t = "matrix3d(" + t + ")";
  proj.style["-webkit-transform"] = t;
  proj.style["-moz-transform"] = t;
  proj.style["-o-transform"] = t;
  proj.style.transform = t;

  //over.style["-webkit-transform"] = t;
  //over.style["-moz-transform"] = t;
  //over.style["-o-transform"] = t;
  //over.style.transform = t;

  this.canvas = proj;
  this.overlay = over;
};

Projection.prototype.saveCalibration = function() {
  var elt = document.getElementById("projection_" + this.target),
      matrix = elt.style.transform;
  matrix = matrix.substring(9, matrix.length-1);
  localStorage.setItem('matrix', matrix);
};

Projection.prototype.calibrate = function(target) {
  this._init(target);
  this.corners = [{'x':100, 'y':100}, {'x':500, 'y':100}, {'x':500, 'y':500}, {'x':100, 'y':500}];
  this.currentCorner = 0;

  var template = document.createElement('template');
  template.innerHTML = Projection.CALIB;
  var children = template.content.children;
  var container = document.getElementById("container_" + this.target);
  while(children.length){
    container.appendChild(children[0]);
  }
  document.getElementById("projection_" + this.target).setAttribute("border", "solid red 2px");
  var _this = this;
	window.addEventListener('dblclick', function(evnt) {
    _this.corners[_this.currentCorner].x = evnt.pageX;
    _this.corners[_this.currentCorner].y = evnt.pageY;
	  _this._update();
	});
  window.addEventListener("keydown", function(e) {
    if (e.keyCode ==  83) { // s
       _this.saveCalibration();
    } else if (e.keyCode === 37) { // ARROW_LEFT
        _this.corners[_this.currentCorner].x -= 1;
    } else if (e.keyCode === 38) { // ARROW_UP
        _this.corners[_this.currentCorner].y -= 1;
    } else if (e.keyCode === 39) { // ARROW_RIGHT
        _this.corners[_this.currentCorner].x += 1;
    } else if (e.keyCode === 40) { // ARROW_DOWN
        _this.corners[_this.currentCorner].y += 1;
    } else if (e.keyCode === 32) { // space
        var elem = document.getElementById("marker" + _this.currentCorner);
        elem.className = "calib-corner";
        _this.currentCorner = (_this.currentCorner+1)%4;
        elem = document.getElementById("marker" + _this.currentCorner);
        elem.className = "calib-active calib-corner";
    }
    _this._update();
  }, false);

  this.ctx = document.getElementById("projection_"+this.target).getContext('2d');
  this.ctx.font = "48px sans";
  this.ctx.fillStyle = "white";
  this.ctx.fillText("double click -- move marker to mouse position", 300, 100);
  this.ctx.fillText("arrow keys -- move marker up/down/left/right", 300, 150);
  this.ctx.fillText("space -- switch marker clockwise", 300, 200);
  this.ctx.fillText("s -- save transformation matrix", 300, 250);
  this._update();
};

Projection.prototype._update = function() {
  var proj = document.getElementById("projection_"+this.target);
  transform2d(proj, this.corners[0].x, this.corners[0].y, this.corners[1].x, this.corners[1].y,
                   this.corners[3].x, this.corners[3].y, this.corners[2].x, this.corners[2].y);
  for (var corner in this.corners){
    var elt = document.getElementById("marker" + corner);
    elt.style.left = this.corners[corner].x + "px";
    elt.style.top = this.corners[corner].y + "px";
  }
};

Projection.prototype.showCoords = function() {
  var ctx = this.canvas.getContext('2d');
  var map = this.config.surface;
  var offsetX = map.width * map.origin.x;
  var offsetY = map.height * map.origin.y;
  var stepX = map.width/10;
  var stepY = map.height/10;

  for (var x = -offsetX; x <= map.width - offsetX; x +=stepX) {
    for (var y = -offsetY; y <= map.height - offsetY; y +=stepY) {
      var s = this.mapCoords(x, y);
      ctx.beginPath();
      ctx.arc(s[0], s[1], 5, 0, Math.PI*2, true);
      ctx.fillStyle = 'green';
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.fillText("  ({0},{1})".format(x,y), s[0], s[1]);
    }
  }
};

Projection.prototype.mapCoords = function (x, y) {
  var screen_x = x/this.mapping.surfaceWidth * this.mapping.screenWidth + this.mapping.offsetX;
  var screen_y = this.mapping.offsetY - (y/this.mapping.surfaceHeight * this.mapping.screenHeight);
  return [screen_x, screen_y];
};

Projection.prototype.addWidget = function(widget, name) {
  name = name ||  "widget_" + this.widgets.length
  this.widgets[name] = widget;
  widget.reset();
};

Projection.prototype.resetWidgets = function () {
  for (var key in this.widgets) {
    this.widgets[key].reset();
  }
};

// internal functions below...

function adj(m) { // Compute the adjugate of m
	return [
		m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
	    m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
	    m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3],
	];
}

function multmm(a, b) { // multiply two matrices
  var c = Array(9);
  for (var i = 0; i != 3; ++i) {
    for (var j = 0; j != 3; ++j) {
      var cij = 0;
      for (var k = 0; k != 3; ++k) {
        cij += a[3*i + k]*b[3*k + j];
      }
      c[3*i + j] = cij;
    }
  }
  return c;
}

function multmv(m, v) { // multiply matrix and vector
  return [
    m[0]*v[0] + m[1]*v[1] + m[2]*v[2],
    m[3]*v[0] + m[4]*v[1] + m[5]*v[2],
    m[6]*v[0] + m[7]*v[1] + m[8]*v[2],
  ];
}

function basisToPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
  var m = [
    x1, x2, x3,
    y1, y2, y3,
     1,  1,  1,
  ];
  var v = multmv(adj(m), [x4, y4, 1]);
  return multmm(m, [
    v[0], 0, 0,
    0, v[1], 0,
    0, 0, v[2],
  ]);
}

function general2DProjection(
  x1s, y1s, x1d, y1d,
  x2s, y2s, x2d, y2d,
  x3s, y3s, x3d, y3d,
  x4s, y4s, x4d, y4d
) {
  var s = basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s);
  var d = basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d);
  return multmm(d, adj(s));
}

function transform2d(elt, x1, y1, x2, y2, x3, y3, x4, y4) {
  var w = elt.offsetWidth, h = elt.offsetHeight;
  var t = general2DProjection
    (0, 0, x1, y1, w, 0, x2, y2, 0, h, x3, y3, w, h, x4, y4);
  for(var i = 0; i != 9; ++i) t[i] = t[i]/t[8];
  t = [t[0], t[3], 0, t[6],
       t[1], t[4], 0, t[7],
       0   , 0   , 1, 0   ,
       t[2], t[5], 0, t[8],];
  t = "matrix3d(" + t.join(", ") + ")";
  elt.style["-webkit-transform"] = t;
  elt.style["-moz-transform"] = t;
  elt.style["-o-transform"] = t;
  elt.style.transform = t;
}

if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined' ? args[number] : match;
    });
  };
}

module.exports = Projection;
