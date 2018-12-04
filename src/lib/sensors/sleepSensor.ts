import { MotivPlatform } from '../platform';
import { toTitleCase, getUTCNowDate, splitDateAndTime } from '../utils';
import { Logger } from '../logger';

export class SleepSensor {
  private uuid: string;
  private platform: MotivPlatform;
  private serviceType: any;
  private accessoryType: string;
  private accessory: any;
  private isAwake: boolean = true;

  constructor(platform: MotivPlatform, uuid: string, accessory: any = undefined) {
    this.uuid = uuid;
    this.platform = platform;
    this.serviceType = MotivPlatform.Service.OccupancySensor;
    this.accessoryType = SleepSensor.accessoryType();
    this.accessory = !!accessory ? this.setup(accessory) : this.create();
  }

  static accessoryType(): string {
    return 'awake';
  }

  update(): void {
    const self = this;
    const now = getUTCNowDate();
    this.platform.log.debug(`Updating ${this.accessory.displayName}`);
    this.platform.motivApi
      .getLastAwakening()
      .then((wokeTime) => {
        const { date: nowDate, time: nowTime } = splitDateAndTime(now);
        const { date: wakeDate, time: wakeTime } = splitDateAndTime(wokeTime);
        const isAwake = nowDate === wakeDate && wokeTime <= now;
        if (self.isAwake !== isAwake) {
          self.isAwake = isAwake;
          self.accessory
            .getService(self.serviceType)
            .setCharacteristic(MotivPlatform.Characteristic.OccupancyDetected, isAwake);

          self.platform.log.debug(
            'Updated isAwake to be: %s (%s === %s && %s <= %s)',
            isAwake,
            nowDate,
            wakeDate,
            wakeTime,
            nowTime
          );
        }
      })
      .catch((err) => {
        self.platform.log.error(
          'Failed to update isAwake status: %s',
          (err.data || {}).error || err
        );
      });
  }

  create() {
    return this.setup(new MotivPlatform.PlatformAccessory(this.accessoryType, this.uuid));
  }

  setup(accessory) {
    const userId = this.platform.config.account.userId;
    try {
      accessory.displayName = toTitleCase(this.accessoryType);
      accessory.context.type = this.accessoryType;
      accessory
        .getService(MotivPlatform.Service.AccessoryInformation)
        .setCharacteristic(MotivPlatform.Characteristic.Manufacturer, 'Motiv Homebridge Sensors')
        .setCharacteristic(MotivPlatform.Characteristic.Model, `Motiv ${this.accessoryType} sensor`)
        .setCharacteristic(
          MotivPlatform.Characteristic.SerialNumber,
          `${this.accessoryType}-${userId}`
        );

      let service = accessory.getService(this.serviceType);
      if (service) {
        service.setCharacteristic(MotivPlatform.Characteristic.Name, accessory.displayName);
      } else {
        service = accessory.addService(this.serviceType, accessory.displayName);
      }

      const self = this;
      service
        .getCharacteristic(MotivPlatform.Characteristic.OccupancyDetected)
        .on('get', (callback) => {
          callback(null, self.isAwake);
        });
    } catch (err) {
      this.platform.log.error(err);
    }

    return accessory;
  }
}
