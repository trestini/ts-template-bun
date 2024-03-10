import { TopologyBuilder } from "@modules/rabbitmq/topology";
import DispatcherConsumer from "@services/consumers/dispatcher-consumer";
// import StatPingConsumer from "@services/consumers/statping-consumer";

const topology = new TopologyBuilder();

export function getTopology() {
  const rabbitmqTopology = topology
    .addExchange("NOTIFICATION_STREAM", "direct")
      .addQueue("notifications_event_stream", "stream")
      .bindTo("NOTIFICATION_STREAM")

    .addExchange("SERVICE_DISPATCHER", "topic")
      .addQueue("statping_notifications", "queue")
      .bindTo("SERVICE_DISPATCHER", "NOTIFICATION.STATPING")
    .addQueue("terraform_notifications", "queue")
      .bindTo("SERVICE_DISPATCHER", "NOTIFICATION.TERRAFORM")
    .addQueue("github_notifications", "queue")
      .bindTo("SERVICE_DISPATCHER", "NOTIFICATION.GITHUB")
    .addQueue("tests_notifications", "queue")
      .bindTo("SERVICE_DISPATCHER", "NOTIFICATION.TEST")

    .addConsumer("notifications_event_stream", new DispatcherConsumer())
    // .addConsumer("statping_notifications", new StatPingConsumer())
    .build();
  return rabbitmqTopology;
}
