import color from 'bash-color';
import { displayName as PluginName } from '../../package.json';

function getLogHeader(): string {
  const now = new Date();
  return `[${now.toLocaleDateString()}, ${now.toLocaleTimeString()}] ${color.purple(
    `[${PluginName}]`
  )}`;
}

function errorOrMessage(error): string {
  return error && error.stack ? error.stack : error;
}

export class Logger {
  private logger;
  private useLogger: boolean;
  constructor(logger, useLogger = true) {
    this.logger = logger;
    this.useLogger = useLogger;
  }

  debug(message: string, ...args: any): void {
    if (this.useLogger) {
      this.logger.debug(errorOrMessage(message), ...args);
    } else {
      console.debug(`${getLogHeader()} ${color.white(errorOrMessage(message))}`, ...args);
    }
  }

  info(message: string, ...args: any): void {
    if (this.useLogger) {
      this.logger.info(errorOrMessage(message), ...args);
    } else {
      console.info(`${getLogHeader()} ${color.blue(errorOrMessage(message))}`, ...args);
    }
  }

  warn(message: string, ...args: any): void {
    if (this.useLogger) {
      this.logger.warn(errorOrMessage(message), ...args);
    } else {
      console.warn(`${getLogHeader()} ${color.yellow(errorOrMessage(message))}`, ...args);
    }
  }

  error(message: string, ...args: any): void {
    if (this.useLogger) {
      this.logger.error(errorOrMessage(message), ...args);
    } else {
      console.error(`${getLogHeader()} ${color.red(errorOrMessage(message))}`, ...args);
    }
  }

  log(message: string, ...args: any): void {
    if (this.useLogger) {
      this.logger.log(errorOrMessage(message), ...args);
    } else {
      console.log(`${getLogHeader()} ${errorOrMessage(message)}`, ...args);
    }
  }

  static critical(message: string, ...args: any): void {
    console.error(`${getLogHeader()} ${color.red(errorOrMessage(message))}`, ...args);
  }
}
