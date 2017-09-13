// @flow

import path from 'path';
import backend from 'micro-business-parse-server-backend';
import setupEndPoint from './endpoint';

const backendInfo = backend({
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

setupEndPoint(backendInfo.get('server'));

process.on('SIGINT', () => process.exit());

backendInfo.get('server').listen(backendInfo.get('serverPort'), () => {
  console.log('TrolleySmart backend started.');
  console.log(JSON.stringify(backendInfo.toJS(), null, 2));
});
