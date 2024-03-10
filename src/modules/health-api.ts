/* eslint-disable @typescript-eslint/no-explicit-any */
import Koa from "koa";
import Router from "koa-router";

import json from "koa-json";
import favicon from "koa-favicon";
import cors from "@koa/cors";

import { RouteMapper } from "../utils/route-mapper";
import { ConfigHandler } from "./config-handler";
import Logger from "./logger";
import { AppEvents, sendEvent } from "./app-events";
const log = Logger.ctx(__filename);

export default function (config: ConfigHandler) {
  return {
    config,
    koaApp: new Koa(),

    async start() {
      const PORT =
        this.config.contents.PORT ||
        process.env.PORT ||
        process.env.port ||
        3001;

      return new Promise<any>((resolve, reject) => {
        const rootRouter = new Router({ prefix: "/" });
        const routeMapper = new RouteMapper(rootRouter);

        routeMapper.addRouter("../healthcheck", "health");

        const timer = setInterval(() => {
          log.debug(
            "[Healthcheck API] Endpoint list\n" +
              rootRouter.stack
                .map((i) => `\t[${i.methods}] ${i.path}`)
                .join("\n")
          );
          clearInterval(timer);

          this.koaApp
            .use(favicon())
            .use(json())
            .use(cors())
            .use(rootRouter.routes())
            .use(rootRouter.allowedMethods());

          try {
            this.koaApp.on("error", (e) => {
              log.error("Unable to process request", e);
            });

            const server = this.koaApp.listen(PORT);
            server.on("error", (e) => {
              reject(e);
            });
            server.on("listening", () => {
              log.info("HealthApi listening on port", PORT);
              sendEvent(AppEvents.MODULE_STARTED, { moduleName: "HealthApi" });
              resolve(true);
            });
          } catch (e) {
            reject(e);
          }
        }, 1);
      });
    },
  };
}
