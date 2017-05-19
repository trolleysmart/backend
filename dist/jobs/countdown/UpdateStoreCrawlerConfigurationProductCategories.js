'use strict';

var _CountdownService = require('./CountdownService');

var _CountdownService2 = _interopRequireDefault(_CountdownService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var jobName = 'Update Store Crawler Countdown Configuration - Product Categories';

Parse.Cloud.job(jobName, function (request, status) {
  // eslint-disable-line no-undef
  var log = request.log;

  log.info('The job ' + jobName + ' has started.');
  status.message('The job ' + jobName + ' has started.');

  var service = new _CountdownService2.default({
    logVerboseFunc: function logVerboseFunc(message) {
      return log.info(message);
    },
    logInfoFunc: function logInfoFunc(message) {
      return log.info(message);
    },
    logErrorFunc: function logErrorFunc(message) {
      return log.error(message);
    }
  });

  service.updateStoreCralwerProductCategoriesConfiguration().then(function () {
    log.info('The job ' + jobName + ' completed successfully.');
    status.success('The job ' + jobName + ' completed successfully.');
  }).catch(function (error) {
    log.error('The job ' + jobName + ' ended in error. Error: ' + JSON.stringify(error));
    status.error('The job ' + jobName + ' ended in error. Error: ' + JSON.stringify(error));
  });
});