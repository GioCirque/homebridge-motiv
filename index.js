const { MotivApi } = require('./lib/motiv');
const chalk = require('chalk');

let Accessory, Characteristic, Service, UUIDGen;

class MotivPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.api = api;
    this.config = config || {};
    this.motivApi = new MotivApi();

    this.api.on('didFinishLaunching', () => {
      if (this.config) {
        const now = new Date(Date.now());
        if (!this.config.account) {
          this.log.error(
            'Incomplete configuration. Run: "motiv-cli login <email>" for account configuration.'
          );
          return;
        } else {
          const sessionExpiry = new Date(Date.parse(this.config.account.sessionExpiry));
          if (sessionExpiry < now) {
            this.log.error(
              'Account session expired. Run "motiv-cli login <email>" to renew session'
            );
            return;
          }
          this.setup();
        }
      }
    });
  }

  setup() {
    this.addSensor(this.config.account, 'heart');
  }

  addSensor(account, type) {
    let accessory = this.accessories[uuid];
    const uuid = UUIDGen.generate(`Motiv_${account.userId}_${type}`);
    if (!accessory) {
      this.log.info(chalk`{blue Adding ${type} sensor for ${account.userId}}`);

      accessory = new Accessory(type, uuid);
      accessory.addService(Service.OccupancySensor, type);

      this.accessories[uuid] = accessory;
      this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);
    }

    accessory
      .getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, 'Motiv Homebridge Sensors')
      .setCharacteristic(Characteristic.Model, `Motiv ${type} sensor`)
      .setCharacteristic(Characteristic.SerialNumber, `${type.toLowerCase()}-${account.userId}`);
  }
}

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory;
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform('homebridge-motiv', 'MotivPlatform', MotivPlatform, true);
};
