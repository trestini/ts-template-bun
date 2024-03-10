import { AppDataSource } from "../db/data-source";
import { ConfigHandler } from "./config-handler";
import AppLogger from "./logger";
import { AppEvents, sendEvent } from "./app-events";
const log = AppLogger.ctx(__filename);

export default function (config: ConfigHandler) {
  return {
    config,

    async start() {
      try {
        const ds = await AppDataSource.initialize();
        log.info("Database initialized", ds.isInitialized);
        sendEvent(AppEvents.MODULE_STARTED, {
          moduleName: "TypeORM",
        });
      } catch (e) {
        log.error("Failed to initialize typeorm", e);
        if( e.code === "ECONNREFUSED" ){
          log.error(`Failed to connect to ${process.env.PG_HOST}`);
        }
        throw e;
      }
    },
  };
}
