"use strict";

var Snap = require('snapsvg');
var Projection = require('./projection');
var AnimationWidget = require('../src/animationwidget');

var Animate = {};

Animate.createElement = function(svgPath, params, callback) {
  if (( params === undefined || !(params.parent || params.id))) {
    throw Error("Either 'parent' or 'id' has to be passed in 'params'");
  }
  var _this = this;
  if (svgPath instanceof SVGSVGElement) {
    var fragment = Snap.parse(new XMLSerializer().serializeToString(svgPath))
    _this.processSnap(fragment, params, callback);
  } else if (svgPath.startsWith('<svg')) {
    _this.processSnap(Snap.parse(svgPath), params, callback);
  } else if (svgPath.endsWith('.xml')) {
    _this._loadElement(svgPath, params, callback);
  } else {
    Snap.load(svgPath, function(fragment) {
      _this.processSnap(fragment, params, callback);
    });
  }
};

Animate.createWidget = function(svgPath, params, callback) {
  Animate.createElement(svgPath, params, function(err, anim) {
    if (err) {return callback(err, undefined);}
    params.animation = anim;
    var widget = new AnimationWidget(params);
    callback(err, widget);
  });
};


Animate._loadElement = function(xmlPath, params, callback) {
  var xhttp = new XMLHttpRequest();
  var _this = this;
  params = params || {};
  params.model = params.model || {};
  xhttp.onreadystatechange = function() {
  if (xhttp.readyState==4 && xhttp.status==200) {
    var doc = xhttp.responseXML;
    var root = doc.getElementsByTagName('animation')[0];
    var style =  doc.getElementsByTagName('style');
    if (style.length > 0) {
      params.style = style[0].textContent;
    }
    var maps = doc.getElementsByTagName('maps');
    if (maps.length > 0) {
      params.map = parseXMLMap(maps[0], params.model);
    }
    var loops = doc.getElementsByTagName('loops');
    if (loops.length > 0) {
      params.loops = parseXMLoops(loops[0]);
    }

    var svg = root.getElementsByTagName('svg')[0];
    if (svg.children.length > 0) {
      var fragment = Snap.parse(new XMLSerializer().serializeToString(svg));
      _this.processSnap(fragment, params, callback);
    } else {
      // svg should be a text node
      svg = svg.textContent;
      // use relative path for SVGs in svg
      if (!svg.startsWith('/')) {
        var tmp = xmlPath.split('/');
        tmp.pop();
        tmp = tmp.join('/');
        svg = tmp + '/' + svg;
      }
      Snap.load(svg, function (fragment) {
        _this.processSnap(fragment, params, callback)
      });
    }
  }};
  xhttp.open("GET", xmlPath, true);
  xhttp.send();
};

Animate.createProjection = function(config, model) {
  return new Projection(config, model);
};

Animate.processSnap = function (fragment, params, callback) {
  params.loops = params.loops || [];

  var el = fragment.select('#import');
  if (! el) {
    callback(Error('Could not parse SVG. Maybe there was no #import group?'), null);
  }
  var paths = parsePaths(fragment.selectAll('path'));
  var base = el.node.viewportElement.viewBox.baseVal;
  // default viewport size
  base = base || {width: 800, height: 600};

  var animation = new Animation(el);
  animation._paths = paths;

  if (params.parent) {
    animation.initSnap(Snap("#" + params.parent));
    animation.id = params.parent;
    if (animation._s.attr("width") === null) {
      animation._s.attr({width: base.width, height: base.height});
    }
  } else {
    animation.initSnap(Snap(base.width, base.height));
    animation._s.node.id = params.id;
    animation.id = params.id;
  }

  var defs = fragment.select('defs');
  if (defs) {
    defs.children().forEach(function(def) {
      animation._s.append(def);
      def.toDefs();
    });
  }

  //console.log("createProcess paths:", paths);

  for (var idx = 0; idx < params.loops.length; ++idx) {
    var l = params.loops[idx];
    animation.addLoop(l.element, l.path, l.duration);
  }

  // bindRotations(animation, rotate_paths);
  if (params.map) {
    bindVariables(animation, params.map);
  }

  applyMasks(el);
  animation._s.selectAll("#import *, #import").forEach(function(el) {
    el.node.id = animation.id + "_" + el.node.id;
  });

  if (params.style) {
    bindStyle(animation, params.style);
    document.head.appendChild(animation.style);
    animation.applyTextAlign();
  }
  animation.start();
  if (callback) {
    callback(null, animation);
  }
};

function applyMasks(element) {
  var masks = element.selectAll('*[id*="mask_"]');
  masks.forEach(function(mask) {
    var id = mask.node.id;
    var target = id.substring(id.indexOf('mask_')+5);
    element.select('#'+target).attr({
      mask: mask
    })
  });
}

// rotation not supported yet
// function bindRotations(animation, paths) {
//   for (var i in paths) {
//     if (paths.hasOwnProperty(i)) {
//       var path = paths[i];
//       var prefix = /rotate\d+_/.exec((path.node.id))[0];
//       var duration = /\d+/.exec(prefix)[0];
//       var targetName = path.node.id.substring(prefix.length);
//       animation.addLoop({
//         target: targetName,
//         duration: duration,
//         path: path
//       });
//     }
//   }
// }
// function rotateProgress(value) {
//   var t = new Snap.Matrix();
//   t.rotate(value*360, this.diff[0], this.diff[1]);
//   this.el.transform(t);
// }

function bindVariables(animation, map) {
  for (var key in map) {
    if (! animation._vars.hasOwnProperty(key)) {
      animation._vars[key] = []
    }
    var targets = map[key];
    for (var idx = 0; idx < targets.length; ++idx) {
      var targetId = targets[idx];
      if (typeof targetId === 'string') {
        var target = animation._s.select('#' + targetId);
        animation._vars[key].push(function(val) {target.node.textContent = val});
      } else if (targetId.hasOwnProperty('element')) {
        animation._vars[key].push(animation.getProgress(targetId.element, targetId.path));
      } else {
        animation.setTrigger({trigger: key, func: targetId.do, model: targetId.model, resolve: targetId.resolve});
      }
    }
  }
}

function parsePaths(paths) {
  var res = {};
  paths.forEach(function(path) {
    res[path.node.id] = path;
  });
  return res;
}

function bindStyle(animation, style) {
  animation.style = document.createElement("style");
  var reg = style.match(/#[^\}]+\{/g);
  reg.forEach(function(m) {
    var id = m.match(/#\w+/)[0];
    style = style.replace(id, "#" + animation.id + "_" + id.slice(1));
  });
  animation.style.textContent = style;
}

function parseXMLMap(xml, model) {
  var map = {};
  for (var i=0; i < xml.children.length; ++i) {
    var xmlMap = xml.children[i];
    var varName = xmlMap.getElementsByTagName('variable')[0].textContent;
    map[varName] = [];
    var children = xmlMap.getElementsByTagName('targets')[0].children;
    for (var j=0; j < children.length; ++j) {
      var targetXML = children[j];
      if (targetXML.children.length === 0) {
        map[varName].push(targetXML.textContent.trim());
        continue;
      }
      var targetVars = {model: model};
      for (var k=0; k < targetXML.children.length; ++k) {
        var childXML = targetXML.children[k];
        var value = undefined;
        if (childXML.nodeName == 'resolve') {
          value = [];
          for (var l=0; l < childXML.children.length; ++l) {
            var val = childXML.children[l];
            value.push(val.textContent.trim())
          }
        } else {
          value = childXML.textContent.trim();
        }
        targetVars[childXML.nodeName] = value;
      }
      map[varName].push(targetVars);
    }
  }
  return map;
}

function parseXMLoops(xml) {
  var loops = [];
  for (var i=0; i < xml.children.length; ++i) {
    var loop = xml.children[i];
    var element = loop.getElementsByTagName('element')[0].textContent.trim();
    var path = loop.getElementsByTagName('path')[0].textContent.trim();
    var duration = loop.getElementsByTagName('duration')[0].textContent.trim();
    loops.push({element: element, path: path, duration: duration});
  }
  return loops;
}

function Animation(element) {
  this._element = element;
  this._loops = {};
  this._cons = {};
  this._model = {};
  this._vars = {};
}

Animation.prototype.initSnap = function(snap) {
  this._s = snap;
  this._s.append(this._element);
  this._s.attr({class: this._s.attr('class') + " animate"});
};

Animation.prototype.set = function(key, value, oldVal) {
  if (key in this._vars) {
    this._vars[key].forEach(function (item) {
      item(value);
    });
  }
  if (key in this._cons) {
    this._cons[key](value, oldVal);
  }
};

Animation.prototype.start = function(animation, params) {
  var tmp = (animation) ? [this._loops[animation]] : this._loops;
  for (var ind in tmp) {
    if (tmp.hasOwnProperty(ind)) {
      var loop = tmp[ind];
      if (loop.hasOwnProperty('control')) {
        loop.control.stop();
      }
      this._tween({
        element: loop.element,
        path: loop.path,
        duration: loop.duration,
        looped: (params) ? params.looped : true,
        offset: {x: -loop.center.x, y: -loop.center.y},
      }, loop);
    }
  }
};

Animation.prototype.align = function(elementName, alignment) {
  if (['start', 'middle', 'end'].indexOf(alignment) === -1) {return;}
  var selector = 'text[id$="'+ elementName +'"]';
  var txt = this._element.select(selector);
  if (txt) {
    var from = txt.attr('text-anchor');
    if (alignment == from) {return;}
    var offset = 0;
    if (alignment == 'end') {
      if (from == 'start') {
        offset = 1;
      } else {
        offset = 0.5
      }
    } else if (alignment == 'middle') {
      if (from == 'end') {
        offset = -0.5
      } else {
        offset = 0.5
      }
    } else {
      if (from == 'end') {
        offset = -1
      } else {
        offset = -0.5
      }
    }

    var box = txt.getBBox();
    txt.attr({
      'x': parseFloat(txt.attr('x')) + offset * box.width + "px",
      'text-anchor': alignment,
    });
  }
};

Animation.prototype.stop = function(animation) {
  var tmp = (animation) ? [this._loops[animation]] : this._loops;
  for (var ind in tmp) {
    if (tmp.hasOwnProperty(ind)) {
      var loop = tmp[ind];
      if (loop.hasOwnProperty('control')) {
        loop.control.stop();
      }
    }
  }
};

Animation.prototype.resume = function(animation) {
  var tmp = (animation) ? [this._loops[animation]] : this._loops;
  for (var ind in tmp) {
    if (tmp.hasOwnProperty(ind)) {
      var loop = tmp[ind];
      var t = loop.control.s * loop.control.end;
      loop.control.stop();
      this._tween({
        element: loop.element,
        path: loop.path,
        duration: loop.duration,
        start: t,
        looped: true,
        offset: {x: -loop.center.x, y: -loop.center.y},
      }, loop);
    }
  }
};

Animation.prototype.addLoop = function(targetId, pathId, duration) {
  var el = this._element.select("#"+targetId);
  var box = el.getBBox();
  var center = {x: box.x + box.width/2, y: box.y + box.height/2};

  window.element = el;
  this._loops[targetId] = {
    element: el,
    duration: duration,
    center: center,
    path: Snap.path.toAbsolute(this._paths[pathId]),
  };
};

Animation.prototype.getProgress = function(targetId, pathId) {
    var target = this._element.select("#"+targetId);
    var path =this._paths[pathId];
    var len = Snap.path.getTotalLength(path);
    var box = target.getBBox();
    var center = {x: box.x + box.width/2, y: box.y + box.height/2};
    var f = function(value) {
      var point = Snap.path.getPointAtLength(path, Math.max(value, 0)*len);
      var mat = new Snap.Matrix();
      mat.translate(point.x-center.x, point.y-center.y);
      target.transform(mat);
    };
    return f;
};

Animation.prototype._tween = function(params, animObj) {
  var _this = this;
  var start = params.start || 0;
  var duration = params.duration || 1000;
  var looped = params.looped || false;
  var offset = params.offset || 0;
  var func;
  if (looped) {
    func = function() {
      _this._tween({
        path: params.path,
        element: params.element,
        start: 0,
        duration: duration,
        looped: looped,
        offset: offset,
      }, animObj);
    }
  } else {
    func = function() {};
  }
  var len = Snap.path.getTotalLength(params.path);
  var fac = (len-start)/len;
  animObj.control = Snap.animate(start, len, function (value) {
    var current = Snap.path.getPointAtLength(params.path, value);
    var mat = new Snap.Matrix();
    mat.translate(current.x + offset.x, current.y + offset.y);
    params.element.transform(mat);
  }, duration*fac, mina.linear, func);
};

Animation.prototype.moveTo = function(x, y) {
  this._s.attr({style: "transform:translate("+x+"px,"+y+"px);"})
};

Animation.prototype.setTrigger = function(params) {
  var tmp;
  var variable = params.trigger;
  var resolve = params.resolve || [];
  var tmpFunc = "tmp = function(model, newVal, oldVal) {\n";

  for (var j = 0; j < resolve.length; ++j) {
    var v = resolve[j];
    tmpFunc += "var " + v + " = this._element.select(\"#" + this.id + "_" + v + "\");\n";
  }

  tmpFunc += params.func;
  tmpFunc += "}";
  eval(tmpFunc);
  this._cons[variable] = tmp.bind(this, params.model);
};

Animation.prototype.applyTextAlign = function() {
  var _this = this;
  this._element.selectAll('text').forEach(function(n) {
    var textAlign = window.getComputedStyle(n.node).textAlign;
    textAlign = (textAlign == 'right') ? 'end' : (textAlign == 'left') ? 'start' : (textAlign == 'center') ? 'middle': textAlign
    _this.align(n.node.id, textAlign);
  })
}

module.exports = Animate;
