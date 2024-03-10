import * as state from "@modules/state-store";
import "dotenv/config";
import "reflect-metadata";
import sdk from "./preload";

const { appName, appVersion, appLabel } = state.all();

const mainTracer = trace.getTracer(appName, appVersion);

import { AppEvents, sendEvent } from "@modules/app-events";
sendEvent(AppEvents.BOOT);

const { ENV, NODE_ENV, CONFIG_PATH, CONFIG_RENEW } = process.env;
const isProd = NODE_ENV?.startsWith("prod") || ENV?.startsWith("prod");

state.addItem("isProd", isProd);

import AppLogger from "@modules/logger";
const logger = AppLogger.ctx(__filename);

logger.info(`Starting application ${appLabel}`);

const configPath =
  CONFIG_PATH || (isProd ? "/config/config.json" : "./config/config.json");
const configRenew = CONFIG_RENEW || "60_000";

logger.info(`-------------------------------------------
Runtime configuration:
NODE_ENV: ${NODE_ENV}
Is production environment: ${isProd}
Configuration path: ${configPath}
Configuration rewew ${configRenew}ms
-------------------------------------------`);

import HealthApi from "@modules/health-api";
import MainApi from "@modules/main-api";
import RabbitMQ from "@modules/rabbitmq/rabbitmq";
import TypeORM from "@modules/typeorm";
import { Span, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { getTopology } from "bootstrap";
import { getInstance, setup } from "./modules/config-handler";

setup(configPath, parseInt(configRenew));
const config = getInstance();
logger.info("Global configuration module loaded");

mainTracer.startActiveSpan(
  "app.start",
  { root: true, kind: SpanKind.INTERNAL },
  async (span: Span) => {
    try {
      await MainApi(config).start();
      logger.info("Main API loaded");

      await HealthApi(config).start();
      logger.info("Health API loaded");

      await TypeORM(config).start();
      logger.info("Database connected, TypeORM loaded");

      await RabbitMQ(config).start(getTopology());
      logger.info("RabbitMQ connected");

      logger.info(`[√] Application ${appLabel} succesfully started`);
      sendEvent(AppEvents.APP_STARTED);
    } catch (e) {
      span.recordException(e);
      logger.error(`[X] Application ${appLabel} startup failed`, e);
      process.exit(1);
    }

    span.setStatus({
      code: SpanStatusCode.OK,
      message: `Application ${appLabel} succesfully started`,
    });
    span.end();

    // setInterval(() => {
    //   logger.info(
    //     {
    //       userDefined: true,
    //     },
    //     `Producing logger for test loki ${Date.now()}`
    //   );
    // }, 5_000);

    // const t = setTimeout(() => {
    //   setInterval(() => {
    //     logger.warn(`This is just a test and can be ignored ${Date.now()}`);
    //   }, 60_000);
    //   clearTimeout(t);
    // }, 10_000);
  }
);

process.on("SIGINT", function () {
  process.stdout.write("\n");
  logger.warn(`[☠️] Caught interrupt signal. Exiting ${appLabel}`);
  logger.info(`Shutting down Open Telemetry NodeSDK`);
  sdk
    ?.shutdown()
    .then((_) => {
      sendEvent(AppEvents.SHUTDOWN);
      logger.info("Shutdown complete");
      process.exit(0);
    })
    .catch((e) => {
      logger.warn("Problem with shutdown. Exiting process with error", e);
      process.exit(1);
    });
});
