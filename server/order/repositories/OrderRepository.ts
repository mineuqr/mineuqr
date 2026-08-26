import type { OrderDomainEvent } from "../domain/events/OrderDomainEvents";

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
  /**
   * POS-SALE-COMMAND-CRITICAL-PATH-HARDENING-1
   * Persist-row status when onPersisted will advance the aggregate in the
   * same transaction (cashier_pos inbound accept). Avoids a second UPDATE
   * round trip. Events still come from onPersisted. Outbox write unchanged.
   */
  createRowStatus?: import("../domain/value-objects/OrderStatus").OrderStatus;
  /**
   * POS-SALE-TRANSACTIONAL-SAFETY-HARDENING-1
   * Companion write on the same DB transaction as Order insert (items, BI, outbox).
   * Caller owns the extra row (e.g. POS sale idempotency). Order still owns Order rows.
   * When set, save must not fall back to the non-transactional legacy path.
   */
  afterPersistInTransaction?: (
    tx: unknown,
    result: SaveOrderResult
  ) => Promise<void>;
  /**
   * CASHIER-PASS-2-PAYMENT-BOUNDARY-RUNTIME-IMPLEMENTATION-1
   * cashier_pos sale HTTP: skip daily display allocation. Payment UI does not
   * show customer-facing invoice identity; paidReceipt falls back to orderNumber
   * until BI exists. Order + items + outbox + sale idempotency still persist.
   */
  skipBusinessIdentityAllocation?: boolean;
};

export interface OrderRepository {
  findById(id: number): Promise<import("../domain/aggregate/Order").Order | null>;
  save(
    order: import("../domain/aggregate/Order").Order,
    options?: SaveOrderOptions
  ): Promise<SaveOrderResult>;
}
