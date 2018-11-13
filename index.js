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
      }
    });
  }

  updateAwakeStatus() {
    const now = new Date(Date.now());
    this.motivApi
      .getLastAwakening()
      .then((wokeTime) => {
        console.info(`Updated isAwake to be ${wokeTime >= now}`);
        self.motivData.isAwake = wokeTime <= now;
      })
      .catch((err) => {
        console.error(err, `Failed to update isAwake status`);
      });
  }

  setup() {
    if (this.motivApi.needsAuth === false) {
      try {
        this.addAccessory('awake');
        setInterval(this.updateAwakeStatus, this.motivSyncInterval);
      } catch (e) {
        console.error(e);
      }
    } else {
      console.error('The Motiv API needs authentication. Run "motiv-cli login <email>"');
    }
  }

  createSensorAccessory(account, type, uuid) {
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
  }

  setupSensor(accessory, type) {
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
  }

  // Called from device classes
  registerPlatformAccessory(accessory) {
    this.log.info('Registering: %s (%s)', accessory.displayName, accessory.UUID);
    this.api.registerPlatformAccessories(PackageName, PluginName, [accessory]);
  }

  // Function invoked when homebridge tries to restore cached accessory
  configureAccessory(accessory) {
    if (!this.accessories.has(uuid)) {
      this.log.info('Configuring: %s (%s)', accessory.displayName, accessory.UUID);
      accessory.context.type = accessory.context.type || 'awake';
      this.setupSensor(accessory, accessory.context.type);
      this.accessories.set(accessory.UUID, accessory);
    }
  }

  addAccessory(accessoryName) {
    const uuid = UUIDGen.generate(`Motiv_${account.userId}_${accessoryName}`);
    if (!this.accessories.has(uuid)) {
      this.log.info('Adding: %s (%s)', accessory.displayName, accessory.UUID);
      const accessory = this.createSensorAccessory(this.config.account, accessoryName);
      this.registerPlatformAccessory(accessory);
      this.accessories.set(accessory.UUID, accessory);
    }
  }

  removeAccessory(accessory) {
    if (!accessory) {
      return;
    }

    this.log.info('Removing: %s (%s)', accessory.displayName, accessory.UUID);
    this.accessories.delete(accessory.UUID);
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
