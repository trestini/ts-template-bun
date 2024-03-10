import { Context, Next } from "koa";
import log from "../modules/logger";
import { getQuote } from "@services/thedogapi";
const logger = log.ctx(__filename);

export async function process(ctx: Context, next: Next) {
  const { nome } = ctx.params;
  logger.info(`Recebi um oi de ${nome}`);

  const resp = await (await getQuote()).json();
  const { url } = resp[0];

  const body = `
  <html><body>
  <h1>Olá ${nome}</h1>
  <img width="500" src="${url}" /></body></html>
  `;

  ctx.status = 200;
  ctx.body = body;
  await next();
}
