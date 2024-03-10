import { Next, Context } from "koa";
import { AppEvents, listener } from "../modules/app-events";

let appLive = false;

listener.on(AppEvents.APP_STARTED, () => {
  appLive = true;
});

export async function isLive(ctx: Context, next: Next) {
  ctx.status = appLive ? 200 : 500;
  await next();
}

export async function isReady(ctx: Context, next: Next) {
  ctx.status = appLive ? 200 : 500;
  await next();
}
