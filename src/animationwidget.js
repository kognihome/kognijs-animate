"use strict";

function AnimationWidget(params) {
  if (! params.projection ) {
    throw Error("Parameter 'projection' has not been passed to AnimationWidget.");
  }
  if (params.parent) {
    throw Error("AnimationWidget supports only 'id'");
  }
  if (params.timeout) {
    this.timeout = params.timeout;
    this.timeoutTimer = 0;
  }

  this.projection = params.projection;
  this.animation = params.animation;
  this.resolve = params.resolveObjectReference;
  this.moveToReference = params.moveToReference;
  this.projection.overlay.appendChild(document.getElementById(params.id));
  this.reset();
}

AnimationWidget.prototype._update = function(value) {
  var oldModel = this.animation.model;
  // Clone incoming data
  // cloning performance: http://web.archive.org/web/20160129131729/http://jsperf.com/cloning-an-object/2
  this.animation.model = JSON.parse(JSON.stringify(value));

  if (this.timeout) {
    clearTimeout(this.timeoutTimer);
    var _this = this;
    this.timeoutTimer = setTimeout(function(){_this.update(value)}, this.timeout);
  }

  if (this.resolve) {
    this.animation.model.object_reference = this.resolveObjectReference(value.object_reference, true);
    if (this.moveToReference) {
      this.animation.moveTo(this.animation.model.object_reference.left - this.animation._s.attr("width")/2,
                            this.animation.model.object_reference.top - this.animation._s.attr("height")/2);
    }
  }

  for (var prop in this.animation._vars) {
    if (value.hasOwnProperty(prop) && value[prop] !== null) {
      var oldVal = (oldModel) ? oldModel[prop] : undefined;
      var newVal = value[prop];
      this.animation.set(prop, newVal, oldVal);
    }
  }

};

AnimationWidget.prototype.reset = function() {
  this.animation._element.attr({style:"visibility: hidden;"});
  this.animation.model = undefined;
  if (this.timeout) {clearTimeout(this.timeout)}
  this.update = function(value) {
    this.animation._element.attr({style:""});
    this.update = this._update;
    this.update(value);
  }
};

AnimationWidget.prototype.resolveObjectReference = function(object_reference, center) {
  center = center || false;
  var result;
  if (object_reference.object && object_reference.object.box) {
    result = this.aabbToView(object_reference.object.box, center);
    result.id = object_reference.object.object_id;
    result.temperature = object_reference.object.object_temperature_celsius;
    result.box = object_reference.object.box;
  } else if (object_reference.object_id) {
    var ob = this.projection.model.detection.objects.filter(function(val) {
      if (val.object_id.id === object_reference.object_id.id) {
        return val.object_id.type === object_reference.object_id.type;
      } else {
        return false;
      }
    });
    if (ob.length !== 1) {
      if (object_reference.pos) {
        var s = this.projection.mapCoords(object_reference.pos.x, object_reference.pos.y)
        result = {left: s[0], top: s[1], id: null, box: null};
      } else {
        console.log("do not know this object with type " + object_reference.object_id.type);
        result = {id: object_reference.object_id, top: -1000, left: -1000, box: null};
      }
      //console.log(result);
      return result;
    }

    ob = ob[0];
    result = this.aabbToView(ob.box, center);
    result.id = ob.object_id;
    result.temperature = ob.object_temperature_celsius;
    result.box = ob.box;
  } else {
    var s = this.projection.mapCoords(object_reference.pos.x, object_reference.pos.y)
    result = {left: s[0], top: s[1], id: null, box: null};
  }
  return result;
};

AnimationWidget.prototype.aabbToView = function(box, center) {
  center = center || false;
  var tr = this.projection.mapCoords(box.left_front_bottom.x + box.width,
                                     box.left_front_bottom.y + box.depth);
  var bl = this.projection.mapCoords(box.left_front_bottom.x, box.left_front_bottom.y);
  var w = tr[0] - bl[0];
  var h = bl[1] - tr[1];
  if (center) {
    bl[0] = bl[0] + w/2;
    tr[1] = tr[1] + h/2;
  }
  return {left: bl[0], top: tr[1], width: w, height: h};
};

module.exports = AnimationWidget;
