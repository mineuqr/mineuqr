/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Server public surface.
 */

export { realtimePlatformRouter } from "./realtimePlatformRouter";
export { realtimeHttpRouter } from "./http/realtimeHttpRouter";
export {
  getRealtimeHintPublisher,
  getRealtimePubSub,
  getRealtimeSseGateway,
  getRealtimeSharedBusStatus,
  isRealtimePlatformEnabled,
} from "./composition";
export { mintRealtimeTicket, verifyRealtimeTicket } from "./tickets/RealtimeTicketService";
export { authorizeRealtimeCredential } from "./tickets/authorizeRealtimeCredential";
export {
  issueOpaqueCustomerTicket,
  lookupOpaqueRealtimeTicket,
  isOpaqueRealtimeTicket,
} from "./tickets/RealtimeOpaqueTicketRegistry";
export { buildRealtimeObservabilityDashboard } from "./observability/realtimeDashboard";
export { evaluateRealtimeHealth } from "./observability/realtimeHealth";
export { evaluateRealtimeAlerts } from "./observability/realtimeAlerts";
export { REALTIME_METRICS_CATALOG } from "./observability/realtimeMetricsCatalog";
export type { RealtimePubSub } from "./pubsub/RealtimePubSub";
export { InMemoryRealtimePubSub } from "./pubsub/RealtimePubSub";
export {
  DatabaseRealtimePubSub,
  createInMemoryRealtimeBusMessageStore,
  isRealtimeSharedBusEnabled,
} from "./pubsub/DatabaseRealtimePubSub";
export { RealtimeHintPublisher } from "./publisher/RealtimeHintPublisher";

