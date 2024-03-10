import { OpenTelemetryBunyanStream } from "@opentelemetry/instrumentation-bunyan";
import Logger, { createLogger } from "bunyan";
import Stream from "stream";
import { all } from "./state-store";

const { isProd, appName } = all();

const logLevel = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

const parsedStdoutLog = new Stream.Writable();
parsedStdoutLog._write = (chunk, _encoding, next) => {
  const parsed = JSON.parse(chunk.toString());
  const { level, msg, time, context } = parsed;
  const [_, filename] = context.split("src/");
  const d = new Date(Date.parse(time)).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  process.stdout.write(
    `${d} ${context ? filename : ""} ${logLevel[level]} ${msg}\n`
  );

  next();
};

const config = {
  name: appName ?? "app",
  level: isProd ? "info" : "debug",
  streams: [
    {
      type: "raw",
      stream: new OpenTelemetryBunyanStream(),
    },
    {
      type: "stream",
      stream: isProd ? process.stdout : parsedStdoutLog,
    },
  ],
} as Logger.LoggerOptions;

const AppLogger = createLogger(config);

function ctx(context: string) {
  return AppLogger.child({ context });
}

function full(context: string, requestId: string) {
  return AppLogger.child({ context, requestId }, true);
}

export default { ctx, full };
