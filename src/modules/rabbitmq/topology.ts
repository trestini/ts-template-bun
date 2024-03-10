import { BaseConsumer } from "@services/consumers/consumer";
import {
  Consumer,
  Exchange,
  ExchangeOptions,
  ExchangeTypes,
  Queue,
  QueueOptions,
  QueueTypes,
  RabbitMQResource,
  StreamConsumer,
} from "./types";

interface TopologyQueueConfig {
  bindTo: (exchange: string, pattern?: string) => TopologyBuilder;
}

export class TopologyBuilder {
  private state: RabbitMQResource[] = [];

  addExchange(
    name: string,
    type: ExchangeTypes = "direct",
    options?: ExchangeOptions
  ): TopologyBuilder {
    this.state.push({
      resourceType: "exchange",
      name,
      type,
      options,
    } as Exchange);

    return this;
  }

  addQueue(
    name: string,
    type: QueueTypes = "queue",
    options?: QueueOptions
  ): TopologyQueueConfig {
    const queueObj = {
      resourceType: "queue",
      name,
      type,
      options,
    } as Queue;

    return {
      bindTo: (exchange: string, pattern: string = ""): TopologyBuilder => {
        this.state.push({
          ...queueObj,
          bindToExchanges: [{ exchange, pattern }],
        } as Queue);
        return this;
      },
    };
  }

  addConsumer<T>(queue: string, consumer: BaseConsumer<T>): TopologyBuilder {
    this.state.push({
      name: queue,
      resourceType: consumer.consumerConfig.isStream
        ? "stream_consumer"
        : "consumer",
      consumer,
    } as Consumer<T> | StreamConsumer<T>);
    return this;
  }

  build(): RabbitMQResource[] {
    return this.state;
  }
}
