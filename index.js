let {
  MotivPlatform,
  PlatformAccessory,
  Characteristic,
  Service,
  UUIDGen,
  PackageName,
  PluginName,
} = require('./lib/platform');

module.exports = function(homebridge) {
  PlatformAccessory = homebridge.platformAccessory;
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform(PackageName, PluginName, MotivPlatform, true);
};
