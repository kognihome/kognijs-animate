'use strict';

var _ = require('lodash');
var fs = require('fs');
var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var nodeResolve = require('resolve');
var browserSync = require('browser-sync');
var mocha = require('gulp-mocha');
var reload = browserSync.reload;

var production = (process.env.NODE_ENV === 'production');

gulp.task('default', ['serve']);

gulp.task('serve', ['build-vendor', 'build-tour', 'browser-sync'], function () {
  gulp.watch('src/**/*.js', ['build-tour', reload]);
  gulp.watch('examples/*.html', reload);
  gulp.watch('tests/*.html', reload);
});

gulp.task('browser-sync', function() {
  browserSync({
    open: false,
    server: {
      baseDir: ["examples", "dist", "tests"],
      index: "tour.html",
      routes: {
        "/bower_components": "bower_components"
      }
    },
  });
});

gulp.task('build-vendor', function () {

  var b = browserify({
    debug: !production
  });


  // get all bower components ids and use 'bower-resolve' to resolve
  // the ids to their full path, which we need for require()
  getBowerPackageIds().forEach(function (id) {
    var resolvedPath = bowerResolve.fastReadSync(id);

    b.require(resolvedPath, {

      // exposes the package id, so that we can require() from our code.
      // for eg:
      // require('./vendor/angular/angular.js', {expose: 'angular'}) enables require('angular');
      // for more information: https://github.com/substack/node-browserify#brequirefile-opts
      expose: id

    });
  });

  // do the similar thing, but for npm-managed modules.
  // resolve path using 'resolve' module
  getNPMPackageIds().forEach(function (id) {
    b.require(nodeResolve.sync(id), { expose: id });
  });

  var stream = b
    .bundle()
    .on('error', function(err){
      // print the error (can replace with gulp-util)
      console.log(err.message);
      // end this stream
      this.emit('end');
    })
    .pipe(source('vendor.js'));

  // pipe additional tasks here (for eg: minifying / uglifying, etc)
  // remember to turn off name-mangling if needed when uglifying

  stream.pipe(gulp.dest('./dist'));

  return stream;
});

gulp.task('build-tour', function () {

  var b = browserify([
      'src/animate.js',
      'src/test.js'
  ], {
    // generate source maps in non-production environment
    debug: !production
  });
  getBowerPackageIds().forEach(function (lib) {
    b.external(lib);
  });
  getNPMPackageIds().forEach(function (id) {
    b.external(id);
  });

  var stream = b.bundle().pipe(source('kogni.animate.tour.js'));
  stream.pipe(gulp.dest('./dist'));

  return stream;
});

gulp.task('test', function () {
    return gulp.src(['tests/**/*.js'], { read: false })
        .pipe(mocha({ reporter: 'spec' }))
});

/**
 * Helper function(s)
 */

function getBowerPackageIds() {
  // read bower.json and get dependencies' package ids
  var bowerManifest = {};
  try {
    bowerManifest = require('./bower.json');
  } catch (e) {
    // does not have a bower.json manifest
  }
  return _.keys(bowerManifest.dependencies) || [];

}


function getNPMPackageIds() {
  // read package.json and get dependencies' package ids
  var packageManifest = {};
  try {
    packageManifest = require('./package.json');
  } catch (e) {
    // does not have a package.json manifest
  }
  return _.keys(packageManifest.dependencies) || [];

}
