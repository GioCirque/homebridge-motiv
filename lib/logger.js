const color = require('bash-color');
const { displayName: PluginName } = require('../package.json');

function getLogHeader() {
  const now = new Date();
  return `[${now.toLocaleDateString()}, ${now.toLocaleTimeString()}] ${color.purple(
    `[${PluginName}]`
  )}`;
}

function errorOrMessage(error) {
  return error && error.stack ? `${error.message}\n${error.stack}` : error;
}

class Logger {
  constructor(logger, useLogger = false) {
    this.logger = logger;
    this.useLogger = useLogger;
  }

  debug(message, ...args) {
    if (this.useLogger) {
      this.logger.debug(errorOrMessage(message), ...args);
    } else {
      console.debug(`${getLogHeader()} ${color.white(errorOrMessage(message))}`, ...args);
    }
  }

  info(message, ...args) {
    if (this.useLogger) {
      this.logger.info(errorOrMessage(message), ...args);
    } else {
      console.info(`${getLogHeader()} ${color.blue(errorOrMessage(message))}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.useLogger) {
      this.logger.warn(errorOrMessage(message), ...args);
    } else {
      console.warn(`${getLogHeader()} ${color.yellow(errorOrMessage(message))}`, ...args);
    }
  }

  error(message, ...args) {
    if (this.useLogger) {
      this.logger.error(errorOrMessage(message), ...args);
    } else {
      console.error(`${getLogHeader()} ${color.red(errorOrMessage(message))}`, ...args);
    }
  }

  log(message, ...args) {
    if (this.useLogger) {
      this.logger.log(errorOrMessage(message), ...args);
    } else {
      console.log(`${getLogHeader()} ${errorOrMessage(message)}`, ...args);
    }
  }
}

module.exports = {
  Logger,
};
