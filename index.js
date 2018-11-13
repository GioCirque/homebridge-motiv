const { MotivApi } = require('./lib/motiv');

let PlatformAccessory, Characteristic, Service, UUIDGen, platform;
const pkg = require('./package.json');
const PackageName = pkg.name;
const PluginName = pkg.displayName;

class MotivPlatform {
  constructor(log, config, api) {
    platform = this;
    platform.log = log;
    platform.api = api;
    platform.config = config || {};
    platform.accessories = new Map();
    platform.serviceType = Service.OccupancySensor;

    platform.motivSyncInterval = (platform.config.syncSeconds || 120) * 1000;
    platform.motivApi = new MotivApi(platform.config.account);
    platform.motivData = {
      isAwake: false,
    };
    platform.api.on('didFinishLaunching', () => {
      const now = new Date(Date.now());
      if (!platform.config.account) {
        platform.log.error(
          'Incomplete configuration. Run: "motiv-cli login <email>" for account configuration.'
        );
        return;
      } else {
        const sessionExpiry = new Date(Date.parse(platform.config.account.sessionExpiry));
        if (sessionExpiry < now) {
          platform.log.error(
            'Account session expired. Run "motiv-cli login <email>" to renew session'
          );
          return;
        }
        platform.setup();
        platform.updateAwakeStatus();
      }
    });
  }

  updateAwakeStatus() {
    platform.log.info('Updating isAwake...');
    try {
      const now = new Date(Date.now());
      platform.motivApi
        .getLastAwakening()
        .then((wokeTime) => {
          const nowDay = now
            .toISOString()
            .split('T')
            .shift();
          const wokeDay = wokeTime
            .toISOString()
            .split('T')
            .shift();
          const isAwake = nowDay === wokeDay && wokeTime <= now;
          platform.log.debug('Updated isAwake to be: %s', isAwake);
          platform.motivData.isAwake = isAwake;
          platform.updateSensors(Characteristic.OccupancyDetected, isAwake);
        })
        .catch((err) => {
          platform.log.error('Failed to update isAwake status: %s', (err.data || {}).error || err);
        });
    } catch (err) {
      platform.log.error(err);
    }
  }

  updateSensors(characteristic, type, value) {
    platform.log.debug('Updated sensors');
    try {
      platform.accessories.forEach((a) => {
        if (a.context.type === type) {
          platform.log.debug('Updating %s to be: %s', a.displayName, value);
          accessory.getService(platform.serviceType).setCharacteristic(characteristic, value);
        }
      });
    } catch (err) {
      platform.log.error(err);
    }
  }

  setup() {
    try {
      if (platform.motivApi.needsAuth === false) {
        setInterval(platform.updateAwakeStatus, platform.motivSyncInterval);
        try {
          platform.addAccessory('awake');
        } catch (err) {
          platform.log.error(err);
        }
      } else {
        platform.log.error('The Motiv API needs authentication. Run "motiv-cli login <email>"');
      }
    } catch (err) {
      platform.log.error(err);
    }
  }

  createSensorAccessory(account, type, uuid) {
    try {
      platform.log.debug(`Creating ${type} (${uuid}) sensor for ${account.userId}`);

      const accessory = new PlatformAccessory(type, uuid);
      accessory.context.type = type;
      platform.setupSensor(accessory, type);

      accessory
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, 'Motiv Homebridge Sensors')
        .setCharacteristic(Characteristic.Model, `Motiv ${type} sensor`)
        .setCharacteristic(Characteristic.SerialNumber, `${type.toLowerCase()}-${account.userId}`);

      return accessory;
    } catch (err) {
      platform.log.error(err);
    }
  }

  setupSensor(accessory, type) {
    try {
      accessory.displayName = `${type[0].toUpperCase()}${type.slice(1).toLowerCase()}`;
      platform.log.debug('Setting up: %s (%s)', accessory.displayName, accessory.UUID);

      let service = accessory.getService(platform.serviceType);
      if (service) {
        service.setCharacteristic(Characteristic.Name, accessory.displayName);
      } else {
        service = accessory.addService(platform.serviceType, accessory.displayName);
      }

      service.getCharacteristic(Characteristic.OccupancyDetected).on('get', (callback) => {
        callback(null, platform.motivData.isAwake);
      });
    } catch (err) {
      platform.log.error(err);
    }
  }

  // Called from device classes
  registerPlatformAccessory(accessory) {
    try {
      platform.log.debug('Registering: %s (%s)', accessory.displayName, accessory.UUID);
      platform.api.registerPlatformAccessories(PackageName, PluginName, [accessory]);
    } catch (err) {
      platform.log.error(err);
    }
  }

  // Function invoked when homebridge tries to restore cached accessory
  configureAccessory(accessory) {
    try {
      if (!platform.accessories.has(accessory.UUID)) {
        platform.log.debug('Configuring: %s (%s)', accessory.displayName, accessory.UUID);
        accessory.context.type = accessory.context.type || 'awake';
        platform.setupSensor(accessory, accessory.context.type);
        platform.accessories.set(accessory.UUID, accessory);
      }
    } catch (err) {
      platform.log.error(err);
    }
  }

  addAccessory(accessoryName) {
    try {
      const uuid = UUIDGen.generate(`Motiv_${platform.config.account.userId}_${accessoryName}`);
      if (!platform.accessories.has(uuid)) {
        const accessory = platform.createSensorAccessory(
          platform.config.account,
          accessoryName,
          uuid
        );
        platform.log.debug('Adding: %s (%s)', accessory.displayName, accessory.UUID);
        platform.registerPlatformAccessory(accessory);
        platform.accessories.set(accessory.UUID, accessory);
      }
    } catch (err) {
      platform.log.error(err);
    }
  }

  removeAccessory(accessory) {
    try {
      if (!accessory) {
        return;
      }
      platform.log.debug('Removing: %s (%s)', accessory.displayName, accessory.UUID);
      platform.accessories.delete(accessory.UUID);
      platform.api.unregisterPlatformAccessories(PackageName, PluginName, [accessory]);
    } catch (err) {
      platform.log.error(err);
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
