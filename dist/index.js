'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _expressGraphql = require('express-graphql');

var _expressGraphql2 = _interopRequireDefault(_expressGraphql);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _microBusinessParseServerBackend = require('micro-business-parse-server-backend');

var _microBusinessParseServerBackend2 = _interopRequireDefault(_microBusinessParseServerBackend);

var _graphql = require('graphql');

var _utilities = require('graphql/utilities');

var _trolleySmartBackendGraphql = require('trolley-smart-backend-graphql');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var parseServerBackendInfo = (0, _microBusinessParseServerBackend2.default)({
  serverHost: process.env.HOST,
  serverPort: process.env.PORT,
  parseServerApplicationId: process.env.PARSE_SERVER_APPLICATION_ID,
  parseServerMasterKey: process.env.PARSE_SERVER_MASTER_KEY,
  parseServerClientKey: process.env.PARSE_SERVER_CLIENT_KEY,
  parseServerJavascriptKey: process.env.PARSE_SERVER_JAVASCRIPT_KEY,
  parseServerFileKey: process.env.PARSE_SERVER_FILE_KEY,
  parseServerDatabaseUri: process.env.PARSE_SERVER_DATABASE_URI,
  startParseDashboard: process.env.START_PARSE_DASHBOARD,
  parseDashboardAuthentication: process.env.PARSE_DASHBOARD_AUTHENTICATION,
  parseServerDashboardApplicationName: process.env.PARSE_SERVER_DASHBOARD_APPLICATION_NAME,
  facebookAppIds: process.env.FACEBOOK_APP_IDS,
  androidCloudMessagingSenderId: process.env.ANDROID_CLOUD_MESSAGING_SENDER_ID,
  androidCloudMessagingServerKey: process.env.ANDROID_CLOUD_MESSAGING_SERVER_KEY,
  parseServerCloudFilePath: _path2.default.resolve(__dirname, 'cloud.js'),
  parseServerAllowClientClassCreation: process.env.PARSE_SERVER_ALLOW_CLIENT_CLASS_CREATION
});

var expressServer = (0, _express2.default)();

expressServer.use('/parse', parseServerBackendInfo.get('parseServer'));

if (parseServerBackendInfo.has('parseDashboard') && parseServerBackendInfo.get('parseDashboard')) {
  expressServer.use('/dashboard', parseServerBackendInfo.get('parseDashboard'));
}

var schema = (0, _trolleySmartBackendGraphql.getRootSchema)();

expressServer.use('/graphql', function (request, response) {
  var configLoader = (0, _trolleySmartBackendGraphql.createConfigLoader)();
  var userLoaderBySessionToken = (0, _trolleySmartBackendGraphql.createUserLoaderBySessionToken)();
  var userDefaultShoppingListLoader = (0, _trolleySmartBackendGraphql.createUserDefaultShoppingListLoader)();

  return (0, _expressGraphql2.default)({
    schema: schema,
    graphiql: true,
    context: {
      request: request,
      sessionToken: request.headers.authorization,
      dataLoaders: {
        configLoader: configLoader,
        userLoaderBySessionToken: userLoaderBySessionToken,
        userDefaultShoppingListLoader: userDefaultShoppingListLoader,
        storeLoaderById: _trolleySmartBackendGraphql.storeLoaderById,
        storeLoaderByKey: _trolleySmartBackendGraphql.storeLoaderByKey,
        tagLoaderByKey: _trolleySmartBackendGraphql.tagLoaderByKey,
        tagLoaderById: _trolleySmartBackendGraphql.tagLoaderById
      }
    }
  })(request, response);
});

expressServer.get('/graphql-schema', function (request, response) {
  (0, _graphql.graphql)(schema, _utilities.introspectionQuery).then(function (json) {
    response.setHeader('Content-Type', 'application/json');
    response.send(JSON.stringify(json, null, 2));
  }).catch(function (error) {
    return response.status(500).send(error);
  });
});

process.on('SIGINT', function () {
  return process.exit();
});

expressServer.listen(parseServerBackendInfo.getIn(['config', 'serverPort']), function () {
  console.log('TrolleySmart backend started.');
  console.log(JSON.stringify(parseServerBackendInfo.get('config').toJS(), null, 2));
});