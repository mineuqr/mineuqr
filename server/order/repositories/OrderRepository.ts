import type { OrderDomainEvent } from "../domain/events/OrderDomainEvents";

export type SaveOrderOptions = {
  expectedUpdatedAt?: string;
  /** Domain events to persist in outbox (same transaction). */
  domainEvents?: OrderDomainEvent[];
  /** Called after order id is assigned (create only) to produce events. */
  onPersisted?: (order: import("../domain/aggregate/Order").Order) => OrderDomainEvent[];
  correlationId?: string | null;
  causationId?: string | null;
  /**
   * WAITER-ORDERING-FOUNDATION-1 — explicit Business Identity scope stamp
   * (e.g. WAITER). When unset, allocator derives from fulfilment/serviceMode.
   */
  identityScope?: string | null;
  /**
   * REPORTING-SALES-CHANNEL-ANALYTICS-1 — OrderingChannelId stamp for reporting.
   * Provenance only — does not change PlaceOrder ownership or identity.
   */
  orderingChannel?: string | null;
};

export type SaveOrderResult = {
  order: import("../domain/aggregate/Order").Order;
  /** Event IDs written to outbox (empty when legacy path / no DB). */
  outboxEventIds: string[];
  /**
   * ORDER-CONFIRMATION-PRESENTATION-ADOPTION-1 — BI assignment from allocate
   * (when present). Confirmation APIs resolve displayReference from this.
   */
  businessIdentity?: {
    businessDay: string;
    dailyDisplayNumber: number;
    identityScope: string;
  };
};

export interface OrderRepository {
  findById(id: number): Promise<import("../domain/aggregate/Order").Order | null>;
  save(
    order: import("../domain/aggregate/Order").Order,
    options?: SaveOrderOptions
  ): Promise<SaveOrderResult>;
}
