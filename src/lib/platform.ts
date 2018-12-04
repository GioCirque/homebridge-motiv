import { MotivApi } from './motiv';
import { Logger } from './logger';
import { SleepSensor } from './sensors/sleepSensor';
import { getUTCNowDate } from './utils';
import { name as PackageName, displayName as PluginName } from '../../package.json';

interface PluginConfig {
  account: {
    userId: string;
    sessionToken: string;
    sessionExpiry: string;
  };
  syncSeconds?: number;
}

export class MotivPlatform {
  private api;
  private accessories: Map<string, any> = new Map<string, any>();
  private motivSyncInterval: number;
  public readonly log: Logger;
  public readonly motivApi: MotivApi;
  public readonly config: PluginConfig;
  public static PlatformAccessory;
  public static Characteristic;
  public static Service;
  public static UUIDGen;

  constructor(log, config, api) {
    this.api = api;
    this.config = config || {};
    this.log = new Logger(log);
    this.accessories = new Map();

    this.motivSyncInterval = (this.config.syncSeconds || 120) * 1000;
    this.motivApi = new MotivApi(this.config.account);

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

  static preInitPlatform(homebridge): void {
    try {
      MotivPlatform.PlatformAccessory = homebridge.platformAccessory;
      MotivPlatform.Characteristic = homebridge.hap.Characteristic;
      MotivPlatform.Service = homebridge.hap.Service;
      MotivPlatform.UUIDGen = homebridge.hap.uuid;
    } catch (err) {
      Logger.critical(err);
    }
  }

  updateSensors(): void {
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

  setup(): void {
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
  registerPlatformAccessory(accessory): void {
    this.api.registerPlatformAccessories(PackageName, PluginName, [accessory]);
  }

  // Function invoked when homebridge tries to restore cached accessory
  configureAccessory(accessory): void {
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

  addAccessory(accessoryName: string): void {
    try {
      const uuid = MotivPlatform.UUIDGen.generate(
        `Motiv_${this.config.account.userId}_${accessoryName}`
      );
      if (!this.accessories.has(uuid)) {
        let accessoryImpl;
        const type = accessoryName.toLowerCase();
        switch (type) {
          case 'awake':
            accessoryImpl = new SleepSensor(this, uuid);
            break;
          default:
            throw new Error(`No Motiv accessory for type "${type}"`);
        }
        this.registerPlatformAccessory(accessoryImpl.accessory);
        this.accessories.set(accessoryImpl.accessory.UUID, accessoryImpl);
      }
    } catch (err) {
      this.log.error(err);
    }
  }

  removeAccessory(accessory): void {
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
