const { MotivApi } = require('lib/motiv');

let Accessory, Characteristic, Service, UUIDGen;

class MotivPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.api = api;
    this.config = config || {};
    this.motivApi = new MotivApi();

    this.api.on('didFinishLaunching', () => {
      this.log.debug('didFinishLaunching');
      if (this.config) {
        const now = new Date(Date.now());
        if (!this.config.account) {
          console.error(chalk`{red.bold MotivPlatform configuration is incomplete.}
          Please run: "motiv-cli login <email>" to get the missing account configuration.`);
          return;
        } else {
          const sessionExpiry = new Date(Date.parse(this.config.account.sessionExpiry));
          if (sessionExpiry < now) {
            console.error(chalk`{red.bold MotivPlatform account session is expired.}
            Please run: "motiv-cli login <email>" to get fresh credentials.`);
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
      this.log(`Adding ${type} sensor for ${account.userId}`);

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
