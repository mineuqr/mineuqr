/**
 * REALTIME-PLATFORM-FOUNDATION-1 / REALTIME-MULTI-INSTANCE-FANOUT-1
 * Process composition root — shared TiDB bus when DATABASE_URL is present.
 */

import { InMemoryRealtimePubSub } from "./pubsub/RealtimePubSub";
import {
  createRealtimePubSub,
  type RealtimeBusStoreStatus,
} from "./pubsub/DatabaseRealtimePubSub";
import { RealtimeHintPublisher } from "./publisher/RealtimeHintPublisher";
import { RealtimeSseGateway } from "./gateway/RealtimeSseGateway";
import type { RealtimePubSub } from "./pubsub/RealtimePubSub";

const bus = createRealtimePubSub();
const publisher = new RealtimeHintPublisher(bus);
const gateway = new RealtimeSseGateway(bus);

export function getRealtimePubSub(): RealtimePubSub {
  return bus;
}

export function getRealtimeHintPublisher(): RealtimeHintPublisher {
  return publisher;
}

export function getRealtimeSseGateway(): RealtimeSseGateway {
  return gateway;
}

export function getRealtimeSharedBusStatus(): RealtimeBusStoreStatus {
  const status = (
    bus as { getStoreStatus?: () => RealtimeBusStoreStatus }
  ).getStoreStatus?.();
  if (status) return status;
  return bus instanceof InMemoryRealtimePubSub ? "disabled" : "ok";
}

export function isRealtimePlatformEnabled(): boolean {
  const raw = process.env.REALTIME_PLATFORM_ENABLED;
  if (raw === "false") return false;
  if (raw === "true") return true;
  // Foundation dark-launch default: enabled in non-production for local/dev;
  // production requires explicit REALTIME_PLATFORM_ENABLED=true.
  return process.env.NODE_ENV !== "production";
}
