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
  this.useObjectReference = params.useObjectReference;
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

  if (this.useObjectReference) {
    this.animation.model.object_reference = this.projection.resolveObjectReference(value.object_reference, true);
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

module.exports = AnimationWidget;
