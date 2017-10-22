// @flow

import express from 'express';
import GraphQLHTTP from 'express-graphql';
import path from 'path';
import parseServerBackend from 'micro-business-parse-server-backend';
import { graphql } from 'graphql';
import { introspectionQuery } from 'graphql/utilities';
import {
  createConfigLoader,
  createUserLoaderBySessionToken,
  getRootSchema,
  storeLoaderById,
  storeLoaderByKey,
  tagLoaderByKey,
  tagLoaderById,
} from 'trolley-smart-backend-graphql';

const parseServerBackendInfo = parseServerBackend({
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
  parseServerCloudFilePath: path.resolve(__dirname, 'cloud.js'),
  parseServerAllowClientClassCreation: process.env.PARSE_SERVER_ALLOW_CLIENT_CLASS_CREATION,
});

const expressServer = express();

expressServer.use('/parse', parseServerBackendInfo.get('parseServer'));

if (parseServerBackendInfo.has('parseDashboard') && parseServerBackendInfo.get('parseDashboard')) {
  expressServer.use('/dashboard', parseServerBackendInfo.get('parseDashboard'));
}

const schema = getRootSchema();

expressServer.use('/graphql', (request, response) => {
  const configLoader = createConfigLoader();
  const userLoaderBySessionToken = createUserLoaderBySessionToken();

  return GraphQLHTTP({
    schema,
    graphiql: true,
    context: {
      request,
      sessionToken: request.headers.authorization,
      dataLoaders: {
        configLoader,
        userLoaderBySessionToken,
        storeLoaderById,
        storeLoaderByKey,
        tagLoaderByKey,
        tagLoaderById,
      },
    },
  })(request, response);
});

expressServer.get('/graphql-schema', (request, response) => {
  graphql(schema, introspectionQuery)
    .then((json) => {
      response.setHeader('Content-Type', 'application/json');
      response.send(JSON.stringify(json, null, 2));
    })
    .catch(error => response.status(500).send(error));
});

process.on('SIGINT', () => process.exit());

expressServer.listen(parseServerBackendInfo.getIn(['config', 'serverPort']), () => {
  console.log('TrolleySmart backend started.');
  console.log(JSON.stringify(parseServerBackendInfo.get('config').toJS(), null, 2));
});
