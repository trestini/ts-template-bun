import { Channel, Connection, ConsumeMessage, Options, connect } from "amqplib";
import { ConfigHandler } from "../config-handler";
import {
  Consumer,
  Exchange,
  ExchangeOptions,
  Queue,
  QueueOptions,
  RabbitMQResource,
  StreamConsumer,
} from "./types";
import { Event } from "@models/event";
import { AppEvents, listener, sendEvent } from "@modules/app-events";
import { deflateSync, inflateSync } from "node:zlib";
import { getItem } from "@modules/state-store";

const applyEncoding = deflateSync;
const resolveEncoding = inflateSync;

const appLabel = getItem("appLabel")

const RABBMTMQ_URI = process.env.RABBITMQ_URI ?? "amqp://127.0.0.1:5672/";

let defaultConnection: Connection;
let defaultChannel: Channel;

listener.on(AppEvents.SHUTDOWN, () => {
  defaultChannel.nackAll(true);
  defaultChannel.connection.close();
});

export default function (config: ConfigHandler) {
  return {
    async start(resources: RabbitMQResource[]) {
      const conn = await connect(RABBMTMQ_URI);
      const channel = await conn.createChannel();
      defaultConnection = conn;
      defaultChannel = channel;

      declareResources(channel, resources);
      sendEvent(AppEvents.MODULE_STARTED, { moduleName: "RabbitMQ" });
    },
  };
}

export async function publish<T>(
  exchange: string,
  event: Event<T>,
  routingKey: string = "",
  shouldCompress = true
) {
  const pubOptions = {
    timestamp: Date.now(),
    contentType: "application/json",
    contentEncoding: shouldCompress ? "deflate" : undefined,
    messageId: event.id,
    type: event.name,
    appId: appLabel,
  } as Options.Publish;
  const msg = Buffer.from(JSON.stringify(event), "utf8");
  const compressedMsg = shouldCompress ? applyEncoding(msg) : msg;
  defaultChannel.publish(exchange, routingKey, compressedMsg, pubOptions);
}

const DEFAULT_ALTERNATE_EXCHANGE = "UNROUTED_MESSAGES";

const QUEUE_DEFAULT_OPTS = {
  arguments: {
    "x-queue-type": "quorum",
  },
  autoDelete: false,
  durable: true,
  exclusive: false,
  passive: false,
} as QueueOptions;

const EXCHANGE_DEFAULT_OPTS = {
  arguments: {
    "alternate-exchange": DEFAULT_ALTERNATE_EXCHANGE,
  },
  autoDelete: false,
  durable: true,
  internal: false,
  passive: false,
  type: "topic",
} as ExchangeOptions;

interface CatalogEntry {
  name: string;
  resource: RabbitMQResource;
}

const catalog: Array<CatalogEntry> = [];

function declareResources(
  channel: Channel,
  resources: Array<RabbitMQResource>
) {
  // configuring alternate exchange
  const aeOptions = { ...EXCHANGE_DEFAULT_OPTS, arguments: {} };
  channel.assertExchange(DEFAULT_ALTERNATE_EXCHANGE, "direct", aeOptions);
  channel.assertQueue(
    DEFAULT_ALTERNATE_EXCHANGE.toLocaleLowerCase(),
    QUEUE_DEFAULT_OPTS
  );
  channel.bindQueue(
    DEFAULT_ALTERNATE_EXCHANGE.toLocaleLowerCase(),
    DEFAULT_ALTERNATE_EXCHANGE,
    ""
  );

  resources.map(async (r) => {
    switch (r.resourceType) {
      case "exchange":
        return declareExchange(channel, r as Exchange);
      case "queue":
        return declareQueue(channel, r as Queue);
      case "consumer":
        return await declareConsumer(r as Consumer<any>);
      case "stream_consumer":
        return await declareStreamConsumer(r as StreamConsumer<any>);
    }
  });
}

function declareExchange(channel: Channel, resource: Exchange) {
  const opts = {
    autoDelete: false,
    durable: true,
    internal: false,
    passive: false,
    type: "topic",
    ...resource.options,
  };

  channel.assertExchange(resource.name, resource.type, opts);

  catalog.push({
    name: resource.name,
    resource: resource,
  });

  return [];
}

function declareQueue(channel: Channel, resource: Queue) {
  const isStream = resource.type === "stream";
  const dlxName = `DLX__${resource.name.toUpperCase()}`;
  const dlqName = `dlq__${resource.name.toLocaleLowerCase()}`;
  const dlx = {
    ...EXCHANGE_DEFAULT_OPTS,
    arguments: {
      ...EXCHANGE_DEFAULT_OPTS.arguments,
      "alternate-exchange": DEFAULT_ALTERNATE_EXCHANGE,
    },
  } as ExchangeOptions;
  channel.assertExchange(dlxName, "direct", dlx);

  const dlq = {
    ...QUEUE_DEFAULT_OPTS,
  } as QueueOptions;
  channel.assertQueue(dlqName, dlq);

  channel.bindQueue(dlqName, dlxName, "");

  const queueOpts = {
    ...QUEUE_DEFAULT_OPTS,
    arguments: {
      ...QUEUE_DEFAULT_OPTS.arguments,
      "x-dead-letter-exchange": isStream ? undefined : dlxName,
    },
  };
  queueOpts.arguments["x-queue-type"] = isStream ? "stream" : "quorum";
  channel.assertQueue(resource.name, queueOpts);

  resource.bindToExchanges?.forEach((bind) =>
    channel.bindQueue(resource.name, bind.exchange, bind.pattern ?? "")
  );
}

async function declareStreamConsumer<T>(resource: StreamConsumer<T>) {
  const currOffset = resource.consumer.getInitOffset();
  return declareConsumer(resource, {
    consumerTag: resource.name,
    arguments: { "x-stream-offset": currOffset ?? -1 },
  });
}

async function declareConsumer<T>(
  resource: Consumer<T>,
  opts?: Options.Consume
) {
  const channel = await defaultConnection.createChannel();
  channel.prefetch(10);
  setTimeout(() => {
    channel.consume(
      resource.name,
      (msg: ConsumeMessage) => {
        const message = Buffer.from(
          msg.properties.contentEncoding
            ? resolveEncoding(Buffer.from(msg.content))
            : msg.content
        ).toString();
        const event = JSON.parse(message) as Event<T>;
        event.args = {
          fields: msg.fields,
          properties: msg.properties,
          ...event.args,
        };
        resource.consumer.consume(event) ? channel.ack(msg) : channel.nack(msg);
      },
      opts
    );
  }, 1000);
}
