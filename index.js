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
    this.accessories = new Map();
    this.serviceType = Service.OccupancySensor;

    this.motivSyncInterval = (this.config.syncSeconds || 300) * 1000;
    this.motivApi = new MotivApi(this.config.account);
    this.motivData = {
      isAwake: false,
    };
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
        this.updateAwakeStatus();
      }
    });
  }

  updateAwakeStatus() {
    this.log.info('Updating isAwake');
    try {
      const now = new Date(Date.now());
      this.motivApi
        .getLastAwakening()
        .then((wokeTime) => {
          this.log.info('Updated isAwake to be: %s', wokeTime >= now);
          self.motivData.isAwake = wokeTime <= now;
        })
        .catch((err) => {
          this.log.error('Failed to update isAwake status: %s', JSON.stringify(err));
        });
    } catch (err) {
      this.log.error(err);
    }
  }

  setup() {
    try {
      if (this.motivApi.needsAuth === false) {
        try {
          this.addAccessory('awake');
          setInterval(this.updateAwakeStatus, this.motivSyncInterval);
        } catch (err) {
          this.log.error(err);
        }
      } else {
        this.log.error('The Motiv API needs authentication. Run "motiv-cli login <email>"');
      }
    } catch (err) {
      this.log.error(err);
    }
  }

  createSensorAccessory(account, type, uuid) {
    try {
      this.log.info(`Creating ${type} (${uuid}) sensor for ${account.userId}`);

      const accessory = new PlatformAccessory(type, uuid);
      accessory.context.type = type;
      this.setupSensor(accessory, type);

      accessory
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, 'Motiv Homebridge Sensors')
        .setCharacteristic(Characteristic.Model, `Motiv ${type} sensor`)
        .setCharacteristic(Characteristic.SerialNumber, `${type.toLowerCase()}-${account.userId}`);

      return accessory;
    } catch (err) {
      this.log.error(err);
    }
  }

  setupSensor(accessory, type) {
    try {
      accessory.displayName = `${type[0].toUpperCase()}${type.slice(1).toLowerCase()}`;
      this.log.info('Setting up: %s (%s)', accessory.displayName, accessory.UUID);

      let service = accessory.getService(this.serviceType);
      if (service) {
        service.setCharacteristic(Characteristic.Name, accessory.displayName);
      } else {
        service = accessory.addService(this.serviceType, accessory.displayName);
      }

      service.getCharacteristic(Characteristic.OccupancyDetected).on('get', (callback) => {
        callback(null, this.motivData.isAwake);
      });
    } catch (err) {
      this.log.error(err);
    }
  }

  // Called from device classes
  registerPlatformAccessory(accessory) {
    try {
      this.log.info('Registering: %s (%s)', accessory.displayName, accessory.UUID);
      this.api.registerPlatformAccessories(PackageName, PluginName, [accessory]);
    } catch (err) {
      this.log.error(err);
    }
  }

  // Function invoked when homebridge tries to restore cached accessory
  configureAccessory(accessory) {
    try {
      if (!this.accessories.has(accessory.UUID)) {
        this.log.info('Configuring: %s (%s)', accessory.displayName, accessory.UUID);
        accessory.context.type = accessory.context.type || 'awake';
        this.setupSensor(accessory, accessory.context.type);
        this.accessories.set(accessory.UUID, accessory);
      }
    } catch (err) {
      this.log.error(err);
    }
  }

  addAccessory(accessoryName) {
    try {
      const uuid = UUIDGen.generate(`Motiv_${this.config.account.userId}_${accessoryName}`);
      if (!this.accessories.has(uuid)) {
        const accessory = this.createSensorAccessory(this.config.account, accessoryName, uuid);
        this.log.info('Adding: %s (%s)', accessory.displayName, accessory.UUID);
        this.registerPlatformAccessory(accessory);
        this.accessories.set(accessory.UUID, accessory);
      }
    } catch (err) {
      this.log.error(err);
    }
  }

  removeAccessory(accessory) {
    try {
      if (!accessory) {
        return;
      }
      this.log.info('Removing: %s (%s)', accessory.displayName, accessory.UUID);
      this.accessories.delete(accessory.UUID);
      this.api.unregisterPlatformAccessories(PackageName, PluginName, [accessory]);
    } catch (err) {
      this.log.error(err);
    }
  }
}

module.exports = function(homebridge) {
  PlatformAccessory = homebridge.platformAccessory;
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform(PackageName, PluginName, MotivPlatform, true);
};
