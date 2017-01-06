module.exports = function(config) {
  config.set({
    browsers: ['Firefox'],
    frameworks: ['mocha', 'sinon-chai', 'browserify'],
    files: [
      'redist/*.js',
      'test/**/redist.spec.redist.js'
    ],
    client: {
      chai: {
        includeStack: true
      }
    },
    reporters: ['progress'],
  });
};
