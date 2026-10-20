// Expo'ning odatiy sozlamasi + Sentry: har bundle va source map'ga bir xil Debug ID yoziladi,
// shunda Sentry ilovadagi xatoni (build'dagi ham, OTA update'dagi ham) asl kod qatoriga bog'lay oladi
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
