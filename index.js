import { MotivApi } from 'lib/motiv';
import { EventEmitter } from 'events';

class MotivPlatform extends EventEmitter {
  constructor(log, config, api) {
    this.log = log;
    this.api = api;
    this.config = config || {};
    const motivApi = new MotivApi();

    this.api.on('didFinishLaunching', () => {
      this.log.debug('didFinishLaunching');
      if (this.config) {
        // Initial state sync and interval setup
      }
    });
  }
}

module.exports = function(homebridge) {
  homebridge.registerPlatform('homebridge-motiv', 'MotivPlatform', MotivPlatform, true);
};
