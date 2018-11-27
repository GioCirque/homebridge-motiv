const color = require('bash-color');
const { displayName: PluginName } = require('../package.json');

function getLogHeader() {
  const now = new Date();
  return `[${now.toLocaleDateString()}, ${now.toLocaleTimeString()}] ${color.purple(
    `[${PluginName}]`
  )}`;
}

class Logger {
  constructor(logger, useLogger = false) {
    this.logger = logger;
    this.useLogger = useLogger;
  }

  debug(message, ...args) {
    if (this.useLogger) {
      this.logger.debug(message, ...args);
    } else {
      console.debug(`${getLogHeader()} ${color.white(message)}`, ...args);
    }
  }

  info(message, ...args) {
    if (this.useLogger) {
      this.logger.info(message, ...args);
    } else {
      console.info(`${getLogHeader()} ${color.blue(message)}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.useLogger) {
      this.logger.warn(message, ...args);
    } else {
      console.warn(`${getLogHeader()} ${color.yellow(message)}`, ...args);
    }
  }

  error(message, ...args) {
    if (this.useLogger) {
      this.logger.error(message, ...args);
    } else {
      console.error(`${getLogHeader()} ${color.red(message)}`, ...args);
    }
  }

  log(message, ...args) {
    if (this.useLogger) {
      this.logger.log(message, ...args);
    } else {
      console.log(`${getLogHeader()} ${message}`, ...args);
    }
  }
}

module.exports = {
  Logger,
};
