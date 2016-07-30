'use strict';

function Dummy(projection) {
  this.projection = projection;
  this.canvas = this.projection.canvas;
  console.log(projection.canvas.height);
  //this.pos = { x: 200,
  //             y: Math.floor(Math.random() * projection.canvas.height), };
    this.pos = { x: 200,
                 y: 200 };
  this.text = new fabric.Text('Hello', {left: this.pos.x, top: this.pos.y, fill: 'white'});
  this.canvas.add(this.text);
}

Dummy.prototype.reset = function() {
  this.canvas.remove(this.text);
  this.update = function(data) {
    this.canvas.add(this.text);
    this.update = Dummy.prototype.update;
    this.update(data);
  };
};

Dummy.prototype.update = function(data) {
  console.log(this.text)
  this.text.set({'text': JSON.stringify(data)});
  console.log(this.text)
};

function ObjectHighlights(projection) {
  this.projection = projection;
  this.canvas = projection.canvas;
  this.rects = [];
  this.texts = [];
  this.reset();
}

ObjectHighlights.prototype.reset = function() {
  this.update('');
};

ObjectHighlights.prototype.update = function(objectList) {
  var labels = objectList.split(",");

  if (labels.length == 1 && !labels[0]) {
    labels = [];
  }

  // TODO: what if the position of the labeled object is not known?
  for (var i = this.rects.length; i < labels.length; ++i) {
    var c = new fabric.Rect({
      opacity: 1, top: 100, left: 100, rx: 20, ry: 20,
      width: 20, height: 20, fill: 'white', stroke: 'white', strokeWidth: '5', });
    // var t = new fabric.Text(dr.label, {top: dr.tl[0], left: dr.tl[1], fill:'white',
    //   fontFamily: 'Source Sans Pro',});
    this.canvas.add(c);
    // _this.canvas.add(t);
    this.rects.push(c);
    // _this.texts.push(t);
  }

  for (i = 0; i < labels.length; ++i) {
    // jshint loopfunc:true
    var ref = labels[i].split('-');
    var p = this.projection.resolveObjectReference({object_id: {type: ref[0], id:ref[1]}});
    p.opacity = 1;
    //console.log(p)
    this.rects[i].set(p);
    // _this.texts[i].set({text: dr1.label, opacity: 1, top: dr1.tl[0], left: dr1.tl[1]});
  }

  for (i = labels.length; i < this.rects.length; ++i) {
    this.rects[i].set({opacity: 0});
    // _this.texts[i].set({text: ''});
  }
};

function MoveTask(projection) {
  this.projection = projection;
  this.canvas = projection.canvas;
  this.circles = [];
  this.numCircles = 3;
  this.defaultRadius = 140;
  this.start = new fabric.Circle({
    radius: 50, stroke: "#24732f", strokeWidth: 20, left: 200,
    top: 200, originX: 'center', originY: 'center',
  });
  this.target = new fabric.Circle({
    radius: 50, stroke: "white", strokeWidth: 20, left: 100,
    top: 100, originX: 'center', originY: 'center',
  });

  for (var i = 0; i < this.numCircles; ++i) {
    var c = new fabric.Circle({
      radius: 10, fill: 'white', left: -20,
      top: -20, originX: 'center', originY: 'center',
    });
    this.circles.push(c);
  }

  this.reset();
}

MoveTask.prototype.reset = function() {
  this.update({relative_progress:1});
};

MoveTask.prototype._update = function(ob) {
  ob.set({left: this.start.getLeft(),
          top: this.start.getTop(),});

  var _this = this;
  //this.grp.animate('top', this.target.top, {duration: 1000});
  ob.animate({
    top: this.target.getTop(),
    left:this.target.getLeft(),
  }, {
    duration: 2000,
    easing: fabric.util.ease.easeInOutQuad,
    onComplete: function() { _this._update(ob); },
  });
};

MoveTask.prototype.update = function(moveTask) {
  if (moveTask.relative_progress >=1) {
    for (var i = 0; i < this.circles.length; ++i) {
      this.canvas.remove(this.circles[i]);
    }
    this.canvas.remove(this.start);
    this.canvas.remove(this.target);
    this._update = function(ob) {};
    this.update = function(moveTask) {
      this.update = MoveTask.prototype.update;
      this._update = MoveTask.prototype._update;
      var _this = this;
      for (var i = 0; i < this.circles.length; ++i) {
        var c = this.circles[i];
        this.canvas.add(c);
        setTimeout(function(ob) {return function() {_this._update(ob);};}(c), i * 500 );
      }
      this.canvas.add(this.start);
      this.canvas.add(this.target);
      this.update(moveTask);
    };
    return;
  }

  var src = this.projection.resolveObjectReference(moveTask.src_reference, true);
  var dst = this.projection.resolveObjectReference(moveTask.dst_reference, true);

  src.radius = (src.box !== null) ? Math.max(src.box.width, src.box.height)/2+20 : this.defaultRadius;
  dst.radius = (dst.box !== null) ? Math.max(dst.box.width, dst.box.height)/2+20 : this.defaultRadius;

  this.start.set(src);
  this.target.set(dst);
};

function VideoWidget(projection) {
  this.projection = projection;
  this.elem = this.projection.addOverlay('video-widget');
  this.reset();
}

VideoWidget.prototype.reset = function() {
  this.elem.empty();
};

VideoWidget.prototype.update = function(url) {
  var _this = this;
  this.reset();
  if (url === '') {
    return;
  } else if (url.substring(0,4) === 'http') {
    var f = '<iframe src="'+url+'"></iframe>';
    this.elem.append(f);
  } else {
    var c = '<video id="videowidget_video" autoplay>' +
            '  <source src="{0}.mp4" type="video/mp4">' +
            '  <source src="{0}.ogg" type="video/ogg">' +
            '  Your browser does not support the video tag.' +
            '</video>';
    this.elem.append(c.format(url));
    var v = document.getElementById('videowidget_video');
    if (this.projection.videoVolume) {
      v.volume = this.projection.videoVolume;
    }

    // dynamically added videos may have issues with event registration.
    // delay to prevent lost event.
    setTimeout(function() {
      v.addEventListener('ended', function() {
        _this.elem.hide('slow', function() {
          _this.reset();
        });
      });
    }, 2000);

  }
  this.elem.show('slow');
}

function WelcomeWidget(projection) {
  this.projection = projection;
  this.content = this.projection.addOverlay('welcome-widget');
  var c = '<h1> Willkommen beim KogniChef </h1>';
  this.content.append(c);
  //this.content.hide();
}

WelcomeWidget.prototype.reset = function() {
  console.log("hideWelcome");
  this.content.hide('slow');
}

WelcomeWidget.prototype.update = function(recipeStep) {
  //console.log(recipeStep);
//  if (recipeStep.id == 'Auswahl') {
//    this.content.show('slow');
//  } else {
//  }
};


function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

var Widgets = {
    ObjectHighlights: ObjectHighlights,
    MoveTask: MoveTask,
    VideoWidget: VideoWidget,
    Welcome: WelcomeWidget,
    Dummy: Dummy
};

module.exports = Widgets;
