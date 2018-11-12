const { MotivApi } = require('./lib/motiv');

let PlatformAccessory, Characteristic, Service, UUIDGen;
const pkg = require('./package.json');
const PackageName = pkg.name;
const PluginName = pkg.displayName;

class MotivPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.api = api;
    this.config = config || {};
    this.motivApi = new MotivApi(this.config.account);
    this.accessories = [];
    this.serviceType = Service.OccupancySensor;

    this.api.on('didFinishLaunching', () => {
      const now = new Date(Date.now());
      if (!this.config.account) {
        this.log.error(
          'Incomplete configuration. Run: "motiv-cli login <email>" for account configuration.'
        );
        return;
      } else {
        const sessionExpiry = new Date(Date.parse(this.config.account.sessionExpiry));
        if (sessionExpiry < now) {
          this.log.error('Account session expired. Run "motiv-cli login <email>" to renew session');
          return;
        }
        this.setup();
      }
    });
  }

  setup() {
    if (this.motivApi.needsAuth === false) {
      try {
        this.addAccessory('awake');
      } catch (e) {
        console.error(e);
      }
    } else {
      console.error('The Motiv API needs authentication. Run "motiv-cli login <email>"');
    }
  }

  createSensorAccessory(account, type) {
    const uuid = UUIDGen.generate(`Motiv_${account.userId}_${type}`);
    this.log.info(`Creating ${type} sensor for ${account.userId}`);

    const accessory = new PlatformAccessory(type, uuid);
    this.setupSensorService(accessory, type);

    accessory
      .getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, 'Motiv Homebridge Sensors')
      .setCharacteristic(Characteristic.Model, `Motiv ${type} sensor`)
      .setCharacteristic(Characteristic.SerialNumber, `${type.toLowerCase()}-${account.userId}`);

    this.registerPlatformAccessory(accessory);

    return accessory;
  }

  setupSensorService(accessory) {
    let service = accessory.getService(this.serviceType);
    if (service) {
      service.setCharacteristic(Characteristic.Name, type);
    } else {
      service = accessory.addService(this.serviceType, type);
    }

    service.getCharacteristic(Characteristic.OccupancyDetected).on('get', (callback) => {
      const now = new Date(Date.now());
      this.log.debug('[%s] On get', accessory.displayName);
      this.motivApi
        .getLastAwakening()
        .then((wokeTime) => callback(null, wokeTime >= now))
        .catch((err) => callback(err));
    });
  }

  // Called from device classes
  registerPlatformAccessory(accessory) {
    this.log.debug('Registering %s', accessory.displayName);
    this.api.registerPlatformAccessories(PackageName, PluginName, [accessory]);
  }

  // Function invoked when homebridge tries to restore cached accessory
  configureAccessory(accessory) {
    this.log.info('Adding: %s', accessory.displayName);
    this.accessories.push(accessory);
  }

  addAccessory(accessoryName) {
    this.log.info('Adding: %s', accessoryName);
    const accessory = this.createSensorAccessory(this.config.account, accessoryName);
    this.accessories.push(accessory);
  }

  removeAccessory(accessory) {
    if (!accessory) {
      return;
    }

    this.log.info('Removing: %s', accessory.displayName);
    this.accessories.delete(accessory);
    this.api.unregisterPlatformAccessories(PackageName, PluginName, [accessory]);
  }
}

module.exports = function(homebridge) {
  PlatformAccessory = homebridge.platformAccessory;
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform(PackageName, PluginName, MotivPlatform, true);
};
