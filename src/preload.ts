import * as state from "@modules/state-store";
import {
  Attributes,
  DiagConsoleLogger,
  DiagLogLevel,
  diag,
} from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK, logs } from "@opentelemetry/sdk-node";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { readFileSync } from "node:fs";

state.addItem("statedAt", Date.now());

let appName: string, appVersion: string;

try {
  const packageJsonContents = readFileSync("package.json");
  const packageJson = JSON.parse(packageJsonContents.toString());
  appName = packageJson.name ?? "development_application";
  appVersion = packageJson.version ?? "development_version";
} catch (e) {
  console.error(
    "Unable to parse package.json. Some information may be required by application",
    e
  );
}

const appLabel = `${appName}:${appVersion}`;

state.addItem("appName", appName);
state.addItem("appVersion", appVersion);
state.addItem("appLabel", appLabel);

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel[process.env.OTEL_DEBUG ?? "INFO"]);

const traceExporter = new OTLPTraceExporter({
  keepAlive: true
});

// const metricsExporter = new OTLPMetricExporter({
//   keepAlive: true
// });

const logExporter = new OTLPLogExporter({
  keepAlive: true,
});

const attributes: Attributes = {
  [SemanticResourceAttributes.SERVICE_NAME]: appName,
  [SemanticResourceAttributes.SERVICE_VERSION]: appVersion,
};

const sdk = new NodeSDK({
  autoDetectResources: true,
  logRecordProcessor: new logs.SimpleLogRecordProcessor(logExporter),
  // metricReader: new PeriodicExportingMetricReader({
  //   exporter: metricsExporter,
  // }),
  serviceName: appName,
  resource: new Resource(attributes),
  traceExporter: traceExporter,
  spanProcessor: new SimpleSpanProcessor(traceExporter),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

if (process.env.NODE_ENV.startsWith("prod")) {
  sdk.start();
} else {
  console.warn("Open Telemetry not started. NODE_ENV: ", process.env.NODE_ENV);
}

export default sdk;
