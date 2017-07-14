// @flow

import path from 'path';
import 'newrelic';
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
  parseServerCloudFilePath: path.resolve(__dirname, 'cloud.js'),
});

setupEndPoint(backendInfo.get('server'));

process.on('SIGINT', () => process.exit());

backendInfo.get('server').listen(backendInfo.get('serverPort'), () => {
  console.log('Smart Grocery backend started.');
  console.log('Server host: ', backendInfo.get('serverHost'));
  console.log('Listening port: ', backendInfo.get('serverPort'));
  console.log('Parse Server url: ', backendInfo.get('parseServerUrl'));
  console.log('Parse Server Application Id: ', backendInfo.get('parseServerApplicationId'));
  console.log('Parse Server Master Key: ', backendInfo.get('parseServerMasterKey'));
  console.log('Parse Server Client Key: ', backendInfo.get('parseServerClientKey'));
  console.log('Parse Server Javascript Key: ', backendInfo.get('parseServerJavascriptKey'));
  console.log('Parse Server File Key: ', backendInfo.get('parseServerFileKey'));
  console.log('Parse Server Database Uri: ', backendInfo.get('parseServerDatabaseUri'));
  console.log('Parse Server Dashboard Application Name: ', backendInfo.get('parseServerDashboardApplicationName'));
});
