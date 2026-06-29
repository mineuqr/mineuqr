import type { ProjectionId } from "./projectionIds";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "./projectionIds";

export type ProjectionLifecycleState =
  | "defined"
  | "infrastructure"
  | "materializing"
  | "queryable";

export type ProjectionOwnerModule =
  | "server/order/read"
  | "server/ops"
  | "server/analytics"
  | "server/analytics/order"
  | "server/diningSession"
  | "server/kitchen/read"
  | "server/printing/read";

export type ProjectionDefinition = {
  id: ProjectionId;
  name: string;
  ownerModule: ProjectionOwnerModule;
  lifecycleState: ProjectionLifecycleState;
  schemaVersion: typeof ORDER_READ_PROJECTION_SCHEMA_VERSION;
  subscribedEventTypes: readonly string[];
  /** Future projection consumer name when materializing. */
  consumerName: string | null;
};

export type ProjectionRecordMeta = {
  projectionId: ProjectionId;
  restaurantId: number;
  schemaVersion: number;
  lastEventId: string | null;
  updatedAt: string;
};

export type TenantScopedProjectionKey = {
  restaurantId: number;
};
