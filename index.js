let { MotivPlatform, PackageName, PluginName } = require('./lib/platform');

module.exports = function(homebridge) {
  MotivPlatform.preInitPlatform(homebridge);
  homebridge.registerPlatform(PackageName, PluginName, MotivPlatform, true);
};
