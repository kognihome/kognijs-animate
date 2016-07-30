var Snap = require('snapsvg');
var log = require('loglevel');
var Projection = require('./projection');

function Animate() {}

Animate.fromConfigXML = function(xmlPath, params, callback) {
  var xhttp = new XMLHttpRequest();
  var _this = this;
  xhttp.onreadystatechange = function() {
  if (xhttp.readyState==4 && xhttp.status==200) {
    var doc = xhttp.responseXML;
    window.doc = doc;
    var root = doc.getElementsByTagName('widget')[0];
    // load SVG data
    var svgPath = root.getElementsByTagName('svgPath');
    var svg = root.getElementsByTagName('svg');
    if (svgPath.length > 0) {
      svgPath = svgPath[0].textContent;
      if (! svgPath.startsWith('/')) {
        var tmp = xmlPath.split('/');
        tmp.pop();
        tmp = tmp.join('/');
        svgPath = tmp+'/'+svgPath;
      }
      Snap.load(svgPath, function(fragment) {
        _this.processSnap(fragment, params, function(animation) {
          configureAnimation(animation, root, callback)
        })
      });
    } else if (svg.length > 0) {
      var fragment = Snap.parse(svg)[0];
      _this.processSnap(fragment, function(animation) {
        configureAnimation(animation, root, callback)
      });
    } else {
      log.error("Load widget failed from", xmlPath);
      return callback(undefined);
    }
  }};
  xhttp.open("GET", xmlPath, true);
  xhttp.send();
};

Animate.createElement = function(svgPath, params, callback) {
  var _this = this;
  Snap.load(svgPath, function(fragment) {
    _this.processSnap(fragment, params, callback);
  });
};

Animate.createProjection = function(parent, config, model) {
  return new Projection(parent, config, model);
};

Animate.processSnap = function (fragment, params, callback) {
    var params = params || {};
    if (! (params.parent || params.id)) {
      log.error('Either parent or id have to be passed to create Animation object');
      return;
    }
    params.loops = params.loops || [];

    var el = fragment.select('#import');
    var paths = parsePaths(fragment.selectAll('path'));
    var base = el.node.viewportElement.viewBox.baseVal;

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

    log.debug("createProcess paths:", paths);

    //animation._vars = bindVariables(el, progress_paths);
    // animation._cons = {};
    // animation._model = this.model;
    for (var idx = 0; idx < params.loops.length; ++idx) {
      var l = params.loops[idx];
      animation.addLoop(l.target, l.path, l.duration);
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
    callback(animation);
};

function applyMasks(element) {
  var masks = element.selectAll('*[id*="mask_"]');
  if (masks === null) {return}
  masks.forEach(function(mask) {
    var id = mask.node.id;
    var target = id.substring(id.indexOf('mask_')+5);
    element.select('#'+target).attr({
      mask: mask
    })
  });
}

function bindRotations(animation, paths) {
  for (var i in paths) {
    if (paths.hasOwnProperty(i)) {
      var path = paths[i];
      var prefix = /rotate\d+_/.exec((path.node.id))[0];
      var duration = /\d+/.exec(prefix)[0];
      var targetName = path.node.id.substring(prefix.length);
      animation.addLoop({
        target: targetName,
        duration: duration,
        path: path
      });
    }
  }
}

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
      } else if (targetId.hasOwnProperty('target')) {
        animation._vars[key].push(animation.getProgress(targetId.target, targetId.path));
      } else {
        animation.setTrigger({trigger: key, func: targetId.do, data: targetId.data, resolve: targetId.resolve});
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

function rotateProgress(value) {
  var t = new Snap.Matrix();
  t.rotate(value*360, this.diff[0], this.diff[1]);
  this.el.transform(t);
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

function configureAnimation(animation, root, callback) {
  var style = root.getElementsByTagName('style');
  var conditions = root.getElementsByTagName('condition');
  var mapping = root.getElementsByTagName('variable');

  if (style.length > 0) {
    animation.style = document.createElement("style");
    var sty =  style[0].textContent;
    var reg = sty.match(/@\w+@/g);
    if (reg) {
      reg.forEach(function(m) {
        sty = sty.replace(m, "#" + animation.id + "_" + m.slice(1,-1))
      });
    }
    animation.style.textContent = sty;
  }

  for (var i = 0; i < mapping.length; ++i) {
    var v = mapping[i];
    animation.mapping[v.getAttribute('view')] = v.getAttribute('model');
  }

  for (var i = 0; i < conditions.length; ++i) {
    var c = conditions[i];
    var v = c.getAttribute('view');
    v = v ? v.split(',') : undefined;
    var m  = c.getAttribute('model');
    m = m ? m.split(',') : undefined;

    animation.setTrigger({
      trigger: c.getAttribute('trigger'),
      model: m,
      view: v,
      func: c.textContent.trim()
    });
  }

  callback(animation);
}

function Animation(element) {
  this._element = element;
  this._loops = {};
  this._cons = {};
  this.mapping = {};
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

Animation.prototype.start = function(animation) {
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
        looped: true,
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
      if (loop.hasOwnProperty('control')) {
          var t = loop.control.s * loop.control.end;
          loop.control.stop();
          this.tween({
            element: loop.element,
            path: loop.path,
            duration: loop.duration,
            start: t,
            looped: true,
            offset: {x: -loop.center.x, y: -loop.center.y},
          }, loop);
      } else {
        this.tween({
          element: loop.element,
          path: loop.path,
          duration: loop.duration,
          looped: true,
          offset: {x: -loop.center.x, y: -loop.center.y},
        }, loop);
      }
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
      var point = Snap.path.getPointAtLength(path, value*len);
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
  var tmpAnim = animObj || {};
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
      }, tmpAnim);
    }
  } else {
    func = function() {};
  }
  var len = Snap.path.getTotalLength(params.path);
  var fac = (len-start)/len;
  tmpAnim.control = Snap.animate(start, len, function (value) {
    var current = Snap.path.getPointAtLength(params.path, value);
    var mat = new Snap.Matrix();
    mat.translate(current.x + offset.x, current.y + offset.y);
    params.element.transform(mat);
  }, duration*fac, mina.linear, func);
  if (! animObj) return tmpAnim;
};

Animation.prototype.moveTo = function(x, y) {
  this._s.attr({style: "transform:translate("+x+"px,"+y+"px);"})
};

Animation.prototype.setTrigger = function(params) {
  var tmp = "";
  var variable = params.trigger;
  var resolve = params.resolve || [];
  var tmpFunc = "tmp = function(data, newVal, oldVal) {\n";

  // for (var i = model.length; i > 0; --i) {
  //   var m = model[i-1].trim();
  //   tmpFunc += "var " + m + " = this._model." + m + ";\n";
  // }

  for (var j = 0; j < resolve.length; ++j) {
    var v = resolve[j];
    tmpFunc += "var " + v + " = this._element.select(\"#" + this.id + "_" + v + "\");\n";
  }

  tmpFunc += params.func;
  tmpFunc += "}";
  eval(tmpFunc);
  this._cons[variable] = tmp.bind(this, params.data);
  if (!(variable in this._vars)) {
    this._vars[variable] = []
  }
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



