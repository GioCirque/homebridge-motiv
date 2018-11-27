const { MotivPlatform } = require('../platform');
const { toTitleCase, getUTCNowDate } = require('../utils');

/*
 * A Motiv sensor for reporting sleep status
 */
class SleepSensor {
  /**
   * Creates a new instance of the sensor with a platform reference
   * @param {MotivPlatform} platform
   */
  constructor(platform, uuid, accessory) {
    this.uuid = uuid;
    this.platform = platform;
    this.serviceType = Service.OccupancySensor;
    this.accessoryType = SleepSensor.accessoryType();
    this.accessory = accessory ? this.setup(accessory) : this.create();

    this.isAwake = true;
  }

  static accessoryType() {
    return 'awake';
  }

  update() {
    const self = this;
    const now = getUTCNowDate();
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
            .setCharacteristic(Characteristic.OccupancyDetected, isAwake);

          self.platform.log.info(
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
    return this.setup(
      new this.platform.PlatformAccessory(this.accessoryType, this.uuid),
      this.accessoryType
    );
  }

  setup(accessory, type) {
    const userId = this.platform.config.account.userId;
    try {
      accessory.displayName = toTitleCase(type);
      accessory.context.type = this.accessoryType;
      accessory
        .getService(this.platform.Service.AccessoryInformation)
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Motiv Homebridge Sensors')
        .setCharacteristic(this.platform.Characteristic.Model, `Motiv ${this.accessoryType} sensor`)
        .setCharacteristic(
          this.platform.Characteristic.SerialNumber,
          `${this.accessoryType}-${userId}`
        );

      let service = accessory.getService(this.serviceType);
      if (service) {
        service.setCharacteristic(Characteristic.Name, accessory.displayName);
      } else {
        service = accessory.addService(this.serviceType, accessory.displayName);
      }

      const self = this;
      service.getCharacteristic(Characteristic.OccupancyDetected).on('get', (callback) => {
        callback(null, self.isAwake);
      });
    } catch (err) {
      this.platform.log.error(err);
    }

    return accessory;
  }
}

module.exports = {
  SleepSensor,
};