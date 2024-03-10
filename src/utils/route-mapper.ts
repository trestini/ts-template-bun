/* eslint-disable @typescript-eslint/no-var-requires */

import * as Router from "koa-router";

export class RouteMapper {
  constructor(
    private rootRouter: Router,
    public basePath: string = "../routers"
  ) {}

  async addRouter(routerDir: string, apiPath: string) {
    const router = await import(`${this.basePath}/${routerDir}/router`);
    this.rootRouter.use(apiPath, router);
    return this.rootRouter;
  }
}
