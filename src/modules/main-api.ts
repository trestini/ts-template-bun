/* eslint-disable @typescript-eslint/no-explicit-any */
import Koa from "koa";
import Router from "koa-router";

import logger from "koa-logger";
import json from "koa-json";
import bodyParser from "koa-bodyparser";
import favicon from "koa-favicon";
import cors from "@koa/cors";

import { Next, Context } from "koa";

import { RouteMapper } from "../utils/route-mapper";

import { readdirSync } from "fs";

import AppLogger from "./logger";
import { ConfigHandler } from "./config-handler";
import { AppEvents, sendEvent } from "./app-events";
import { Span, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";

const log = AppLogger.ctx(__filename);
const tracer = trace.getTracer("request");

export default function (config: ConfigHandler) {
  return {
    koaApp: new Koa(),
    config,

    async start() {
      tracer.startActiveSpan(
        "app.setup",
        { kind: SpanKind.INTERNAL },
        (span: Span) => {
          const PORT =
            this.config.contents.PORT ||
            process.env.PORT ||
            process.env.port ||
            3000;

          const {
            autoDiscoveryFeatures,
            autoDiscoveryFeaturesBasePath,
            routes,
          } = this.config.contents.MainApi || {};

          const { baseUri } = this.config.contents.MainApi || "";

          return new Promise<any>((resolve, reject) => {
            const rootRouter = new Router({ prefix: baseUri });
            const routeMapper = new RouteMapper(rootRouter);

            if (autoDiscoveryFeatures) {
              log.debug("Features auto-discover turned on");
              const featuresBasePath =
                autoDiscoveryFeaturesBasePath || "./src/routers";
              readdirSync(featuresBasePath, { withFileTypes: true })
                .filter((e) => e.isDirectory())
                .map((d) => d.name)
                .forEach((routerDir) => {
                  const apiPath = `/${routerDir}`;
                  log.info(
                    `[MainApi] AUTO adding route dir '${routerDir}' on path '${baseUri}${apiPath}'`
                  );
                  routeMapper.addRouter(routerDir, apiPath);
                });
            } else {
              log.debug("Features auto-discover turned off");
              routes &&
                routes.forEach((route) => {
                  log.info(
                    `[MainApi] Adding route dir '${route.routerDir}' on path '${baseUri}${route.apiPath}'`
                  );
                  routeMapper.addRouter(route.routerDir, route.apiPath);
                });
            }

            const timer = setInterval(() => {
              // o roteador registra as rotas assincronamente
              if (rootRouter.stack?.length > 0) {
                log.debug(
                  "[MainApi] Endpoint list\n" +
                    rootRouter.stack
                      .map((i) => `\t[${i.methods}] ${i.path}`)
                      .join("\n")
                );
                clearInterval(timer);

                this.koaApp
                  .use(logger())
                  .use(async (ctx: Context, next: Next) => {
                    ctx.config = this.config.contents;
                    await next();
                  })
                  .use(favicon())
                  .use(json())
                  .use(cors())
                  .use(bodyParser({ jsonLimit: "10mb" }))
                  .use(rootRouter.routes())
                  .use(rootRouter.allowedMethods());

                try {
                  this.koaApp.on("error", (e) => {
                    span.recordException(e);
                    log.error("Unable to process request", e);
                  });

                  const server = this.koaApp.listen(PORT);
                  server.on("error", (e) => {
                    span.recordException(e);
                    reject(e);
                  });
                  server.on("listening", () => {
                    const startMsg = `MainApi listening on port ${PORT}`;
                    log.info(startMsg);
                    sendEvent(AppEvents.MODULE_STARTED, {
                      moduleName: "MainApi",
                    });
                    resolve(true);
                    span.setStatus({
                      code: SpanStatusCode.OK,
                      message: startMsg,
                    });
                  });
                } catch (e) {
                  span.recordException(e);
                  reject(e);
                }
              }
            }, 10);
          }).finally( () => {
            span.end()
          })
        }
      );
    },
  };
}
