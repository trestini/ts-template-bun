import EventEmitter from "events";
const emitter = new EventEmitter();
import logger from "@modules/logger";
const log = logger.ctx(__filename);

export enum AppEvents {
  BOOT = "BOOT",
  MODULE_STARTED = "MODULE_STARTED",
  APP_STARTED = "APP_STARTED",
  REQUEST_OK = "REQUEST_OK",
  REQUEST_ERROR = "REQUEST_ERROR",
  SHUTDOWN = "SHUTDOWN"
}

export interface EventArgs {
  timestamp?: number;
  moduleName?: string;
}

export const sendEvent = (event: AppEvents, args?: EventArgs) => {
  emitter.emit(event, { event, ...args, timestamp: Date.now() });
};

const logEvent = (args) => {
  const { event, timestamp, ...logs } = args;
  log.info(`${timestamp} [${event}] ${JSON.stringify({ logs })}`);
};

export const listener = emitter;

emitter.on(AppEvents.BOOT, logEvent);
emitter.on(AppEvents.MODULE_STARTED, logEvent);
emitter.on(AppEvents.APP_STARTED, logEvent);
