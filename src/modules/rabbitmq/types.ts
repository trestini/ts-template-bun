import { Event } from "@models/event";
import { BaseConsumer, BaseStreamConsumer } from "@services/consumers/consumer";

export type ExchangeTypes = "topic" | "headers" | "direct" | "fanout";
export type QueueTypes = "queue" | "stream";
export type ResourceType =
  | "queue"
  | "exchange"
  | "consumer"
  | "stream_consumer";

export interface RabbitMQResource {
  name: string;
  resourceType: ResourceType;
}

type QueueBind = {
  exchange: string;
  pattern?: string;
};

export interface Queue extends RabbitMQResource {
  type: QueueTypes;
  options?: QueueOptions;
  bindToExchanges: QueueBind[];
}

export interface Exchange extends RabbitMQResource {
  type: ExchangeTypes;
  options?: ExchangeOptions;
}

export interface ConsumerCallback<T> {
  (message: Event<T>): boolean;
}

export interface Consumer<T> extends RabbitMQResource {
  consumer: BaseConsumer<T>;
}

export interface StreamConsumer<T> extends Consumer<T> {
  consumer: BaseStreamConsumer<T>;
}

/*
From: 
https://github.com/cody-greene/node-rabbitmq-client/blob/459e779f2732d7682d850648fcc1a1179690f585/src/codec.ts
*/

export interface QueueOptions {
  arguments?: {
    /** Per-Queue Message TTL https://www.rabbitmq.com/ttl.html#per-queue-message-ttl */
    "x-message-ttl"?: number;
    /** Queue Expiry https://www.rabbitmq.com/ttl.html#queue-ttl */
    "x-expires"?: number;
    /** https://www.rabbitmq.com/dlx.html */
    "x-dead-letter-exchange"?: string;
    /** https://www.rabbitmq.com/dlx.html */
    "x-dead-letter-routing-key"?: string;
    /** https://www.rabbitmq.com/maxlength.html */
    "x-max-length"?: number;
    /** https://www.rabbitmq.com/maxlength.html */
    "x-overflow"?: "drop-head" | "reject-publish" | "reject-publish-dlx";
    /** https://www.rabbitmq.com/priority.html */
    "x-max-priority"?: number;
    /** https://www.rabbitmq.com/quorum-queues.html
     * https://www.rabbitmq.com/streams.html */
    "x-queue-type"?: "quorum" | "classic" | "stream";
    [k: string]: any;
  };
  /** If set, the queue is deleted when all consumers have finished using it.
   * The last consumer can be cancelled either explicitly or because its
   * channel is closed. If there was no consumer ever on the queue, it won't
   * be deleted. Applications can explicitly delete auto-delete queues using
   * the Delete method as normal. */
  autoDelete?: boolean;
  /** If set when creating a new queue, the queue will be marked as durable.
   * Durable queues remain active when a server restarts. Non-durable queues
   * (transient queues) are purged if/when a server restarts. Note that
   * durable queues do not necessarily hold persistent messages, although it
   * does not make sense to send persistent messages to a transient queue. */
  durable?: boolean;
  /** Exclusive queues may only be accessed by the current connection, and
   * are deleted when that connection closes. Passive declaration of an
   * exclusive queue by other connections are not allowed. */
  exclusive?: boolean;
  /** If set, the server will reply with Declare-Ok if the queue already
   * exists with the same name, and raise an error if not. The client can use
   * this to check whether a queue exists without modifying the server state.
   * When set, all other method fields except name and no-wait are ignored. A
   * declare with both passive and no-wait has no effect. */
  passive?: boolean;
}

export interface ExchangeOptions {
  arguments?: {
    /** https://www.rabbitmq.com/ae.html */
    "alternate-exchange"?: string;
    [k: string]: any;
  };
  /** If set, the exchange is deleted when all queues have finished using it. */
  autoDelete?: boolean;
  /** If set when creating a new exchange, the exchange will be marked as
   * durable. Durable exchanges remain active when a server restarts.
   * Non-durable exchanges (transient exchanges) are purged if/when a server
   * restarts. */
  durable?: boolean;
  /** Exchange names starting with "amq." are reserved for pre-declared and
   * standardised exchanges. The exchange name consists of a non-empty
   * sequence of these characters: letters, digits, hyphen, underscore,
   * period, or colon. */
  exchange: string;
  /** If set, the exchange may not be used directly by publishers, but only
   * when bound to other exchanges. Internal exchanges are used to construct
   * wiring that is not visible to applications. */
  internal?: boolean;
  /** If set, the server will reply with Declare-Ok if the exchange already
   * exists with the same name, and raise an error if not. The client can use
   * this to check whether an exchange exists without modifying the server
   * state. When set, all other method fields except name and no-wait are
   * ignored. A declare with both passive and no-wait has no effect.
   * Arguments are compared for semantic equivalence. */
  passive?: boolean;
  /** direct, topic, fanout, or headers: Each exchange belongs to one of a
   * set of exchange types implemented by the server. The exchange types
   * define the functionality of the exchange - i.e. how messages are routed
   * through it.
   * @default "direct" */
  type?: string;
}
