/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Process-local composition root (replace bus for multi-instance later).
 */

import { InMemoryRealtimePubSub } from "./pubsub/RealtimePubSub";
import { RealtimeHintPublisher } from "./publisher/RealtimeHintPublisher";
import { RealtimeSseGateway } from "./gateway/RealtimeSseGateway";

const bus = new InMemoryRealtimePubSub();
const publisher = new RealtimeHintPublisher(bus);
const gateway = new RealtimeSseGateway(bus);

export function getRealtimePubSub(): InMemoryRealtimePubSub {
  return bus;
}

export function getRealtimeHintPublisher(): RealtimeHintPublisher {
  return publisher;
}

export function getRealtimeSseGateway(): RealtimeSseGateway {
  return gateway;
}

export function isRealtimePlatformEnabled(): boolean {
  const raw = process.env.REALTIME_PLATFORM_ENABLED;
  if (raw === "false") return false;
  if (raw === "true") return true;
  // Foundation dark-launch default: enabled in non-production for local/dev;
  // production requires explicit REALTIME_PLATFORM_ENABLED=true.
  return process.env.NODE_ENV !== "production";
}
