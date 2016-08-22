module.exports = function(config) {
  config.set({
    browsers: ['Firefox'],
    frameworks: ['mocha', 'sinon-chai', 'browserify'],
    files: [
      'redist/*.js',
      'test/**/redist.spec.js'
    ],
    client: {
      chai: {
        includeStack: true
      }
    },
    reporters: ['progress'],
  });
};
