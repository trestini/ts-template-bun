import Router from "koa-router";
const router = new Router();
import { process } from "../../controllers/demo-controller";

router.get("/:nome", process);

export { router };
