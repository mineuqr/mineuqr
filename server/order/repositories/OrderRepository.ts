import type { OrderDomainEvent } from "../domain/events/OrderDomainEvents";

export type SaveOrderOptions = {
  expectedUpdatedAt?: string;
  /** Domain events to persist in outbox (same transaction). */
  domainEvents?: OrderDomainEvent[];
  /** Called after order id is assigned (create only) to produce events. */
  onPersisted?: (order: import("../domain/aggregate/Order").Order) => OrderDomainEvent[];
  correlationId?: string | null;
  causationId?: string | null;
};

export type SaveOrderResult = {
  order: import("../domain/aggregate/Order").Order;
  /** Event IDs written to outbox (empty when legacy path / no DB). */
  outboxEventIds: string[];
};

export interface OrderRepository {
  findById(id: number): Promise<import("../domain/aggregate/Order").Order | null>;
  save(
    order: import("../domain/aggregate/Order").Order,
    options?: SaveOrderOptions
  ): Promise<SaveOrderResult>;
}
