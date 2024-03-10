import { DataSource } from "typeorm";
import { Notification } from "./entities/notification";
import { Source } from "./entities/source";
import { StreamOffset } from "./entities/stream-offset";


const PG_HOST = process.env.PG_HOST ?? "127.0.0.1";
const PG_PORT = process.env.PG_PORT ?? "5432";
const PG_USER = process.env.PG_USER ?? "pg";
const PG_PASS = process.env.PG_PASS ?? "pg";
const PG_DATABASE = process.env.PG_DATABASE ?? "pg";

const TYPEORM_LOG_SQL = process.env.TYPEORM_LOG_SQL ?? "false";

export const AppDataSource = new DataSource({
    type: "postgres",
    poolSize: 5,
    host: PG_HOST,
    port: parseInt(PG_PORT),
    username: PG_USER,
    password: PG_PASS,
    database: PG_DATABASE,
    synchronize: true,
    logging: TYPEORM_LOG_SQL === "true",
    migrationsRun: true,
    entities: [Notification, Source, StreamOffset],
    subscribers: [],
    migrations: []
});
