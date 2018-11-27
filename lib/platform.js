const { MotivApi } = require('./motiv');
const { Logger } = require('./logger');
const { SleepSensor } = require('./sensors/sleepSensor');
const { getUTCNowDate } = require('./utils');
const { name: PackageName, displayName: PluginName } = require('../package.json');

let PlatformAccessory, Characteristic, Service, UUIDGen;

class MotivPlatform {
  constructor(log, config, api) {
    this.api = api;
    this.config = config || {};
    this.log = new Logger(log);
    this.accessories = new Map();

    this.motivSyncInterval = (this.config.syncSeconds || 120) * 1000;
    this.motivApi = new MotivApi(this.config.account);
    this.motivData = {
      isAwake: false,
    };

    this.PlatformAccessory = PlatformAccessory;
    this.Characteristic = Characteristic;
    this.Service = Service;
    this.UUIDGen = UUIDGen;

    const self = this;
    this.api.on('didFinishLaunching', () => {
      const now = getUTCNowDate();
      if (!self.config.account) {
        self.log.error(
          'Incomplete configuration. Run: "motiv-cli login <email>" for account configuration.'
        );
        return;
      } else {
        const sessionExpiry = new Date(Date.parse(self.config.account.sessionExpiry));
        if (sessionExpiry < now) {
          self.log.error('Account session expired. Run "motiv-cli login <email>" to renew session');
          return;
        }
        self.setup();
        self.updateSensors();
      }
    });
  }

  static preInitPlatform(homebridge) {
    try {
      PlatformAccessory = homebridge.platformAccessory;
      Characteristic = homebridge.hap.Characteristic;
      Service = homebridge.hap.Service;
      UUIDGen = homebridge.hap.uuid;
    } catch (err) {
      Logger.critical(err);
    }
  }

  updateSensors() {
    try {
      this.accessories.forEach((a) => {
        if (a && a.update && typeof a.update === 'function') {
          a.update();
        } else {
          this.log.error(
            `Device '${
              a.accessory.displayName
            }' is NOT updatable. Did the developer cache the wrong instance?`
          );
        }
      });
    } catch (err) {
      this.log.error(err);
    }
  }

  setup() {
    try {
      if (this.motivApi.needsAuth === false) {
        setInterval(
          (function(self) {
            return function() {
              self.updateSensors();
            };
          })(this),
          this.motivSyncInterval
        );
        try {
          this.addAccessory(SleepSensor.accessoryType());
          /* Include additional accessories here */
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

  // Called from device classes
  registerPlatformAccessory(accessory) {
    this.api.registerPlatformAccessories(PackageName, PluginName, [accessory]);
  }

  // Function invoked when homebridge tries to restore cached accessory
  configureAccessory(accessory) {
    try {
      if (!this.accessories.has(accessory.UUID)) {
        const type = accessory.context.type || SleepSensor.accessoryType();

        let accessoryImpl;
        switch (type) {
          case 'awake':
            accessoryImpl = new SleepSensor(this, accessory.UUID, accessory);
            break;
          default:
            this.removeAccessory(accessory);
            throw new Error(
              `No Motiv accessory for type "${type}". This accessory has been removed.`
            );
        }
        this.accessories.set(accessory.UUID, accessoryImpl);
      }
    } catch (err) {
      this.log.error(err);
    }
  }

  addAccessory(accessoryName) {
    try {
      const uuid = UUIDGen.generate(`Motiv_${this.config.account.userId}_${accessoryName}`);
      if (!this.accessories.has(uuid)) {
        let accessoryImpl;
        switch (type) {
          case 'awake':
            accessoryImpl = new SleepSensor(this, uuid);
            break;
          default:
            throw new Error(`No Motiv accessory for type "${type}"`);
        }
        this.registerPlatformAccessory(accessory);
        this.accessories.set(accessory.UUID, accessoryImpl);
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
      this.accessories.delete(accessory.UUID);
      this.api.unregisterPlatformAccessories(PackageName, PluginName, [accessory]);
    } catch (err) {
      this.log.error(err);
    }
  }
}

module.exports = {
  MotivPlatform,
  PlatformAccessory,
  Characteristic,
  Service,
  UUIDGen,
  PackageName,
  PluginName,
};
