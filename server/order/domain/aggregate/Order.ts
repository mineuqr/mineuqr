import { OrderLine, type OrderLineProps } from "./OrderLine";
import type { OrderStatus } from "../value-objects/OrderStatus";
import {
  assertOrderStatus,
  isTerminalOrderStatus,
} from "../value-objects/OrderStatus";
import type { OrderActor } from "../value-objects/OrderActor";
import { OrderLifecyclePolicy } from "../policies/OrderLifecyclePolicy";
import { OrderCancellationPolicy } from "../policies/OrderCancellationPolicy";
import {
  EmptyOrderError,
  InvalidTransitionError,
  OrderAlreadyCancelledError,
  OrderAlreadyCompletedError,
} from "../errors/OrderDomainErrors";
import type { OrderDomainEvent } from "../events/OrderDomainEvents";
import { ORDER_DOMAIN_EVENT_SCHEMA_VERSION } from "../events/OrderDomainEvents";

export type NewOrderProps = {
  restaurantId: number;
  tableId: number;
  tableNumber: number;
  sessionId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  totalAmount: string;
  orderNumber: string;
  trackingToken: string;
  lines: OrderLineProps[];
  createdAt: string;
};

export type PersistedOrderProps = NewOrderProps & {
  id: number;
  status: OrderStatus;
  readyAt: string | null;
  updatedAt: string;
};

export class Order {
  private readonly _events: OrderDomainEvent[] = [];

  readonly id?: number;
  readonly restaurantId: number;
  readonly tableId: number;
  readonly tableNumber: number;
  readonly sessionId: number | null;
  readonly customerName: string | null;
  readonly customerPhone: string | null;
  readonly notes: string | null;
  readonly totalAmount: string;
  readonly orderNumber: string;
  readonly trackingToken: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  private _status: OrderStatus;
  private _readyAt: string | null;
  private readonly _lines: OrderLine[];

  private constructor(props: PersistedOrderProps) {
    this.id = props.id;
    this.restaurantId = props.restaurantId;
    this.tableId = props.tableId;
    this.tableNumber = props.tableNumber;
    this.sessionId = props.sessionId ?? null;
    this.customerName = props.customerName ?? null;
    this.customerPhone = props.customerPhone ?? null;
    this.notes = props.notes ?? null;
    this.totalAmount = props.totalAmount;
    this.orderNumber = props.orderNumber;
    this.trackingToken = props.trackingToken;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this._status = props.status;
    this._readyAt = props.readyAt;
    this._lines = props.lines.map((line) => OrderLine.create(line));
  }

  get status(): OrderStatus {
    return this._status;
  }

  get readyAt(): string | null {
    return this._readyAt;
  }

  get lines(): readonly OrderLine[] {
    return this._lines;
  }

  static placeNew(props: NewOrderProps): Order {
    if (props.lines.length === 0) {
      throw new EmptyOrderError();
    }

    const lines = props.lines.map((line) => OrderLine.create(line));
    const computedTotal = lines
      .reduce((sum, line) => sum + line.lineTotal(), 0)
      .toFixed(2);

    if (computedTotal !== props.totalAmount) {
      throw new Error("Order total does not match line totals");
    }

    const order = new Order({
      ...props,
      id: 0,
      status: "pending",
      readyAt: null,
      updatedAt: props.createdAt,
      sessionId: props.sessionId ?? null,
      lines: props.lines,
    });

    return order;
  }

  static reconstitute(props: PersistedOrderProps): Order {
    return new Order({
      ...props,
      status: assertOrderStatus(props.status),
    });
  }

  recordCreated(orderId: number): void {
    const lineCount = this._lines.reduce((sum, line) => sum + line.quantity, 0);
    this._events.push({
      type: "OrderCreated",
      schemaVersion: ORDER_DOMAIN_EVENT_SCHEMA_VERSION,
      orderId,
      restaurantId: this.restaurantId,
      tableId: this.tableId,
      tableNumber: this.tableNumber,
      orderNumber: this.orderNumber,
      trackingToken: this.trackingToken,
      totalAmount: this.totalAmount,
      lineCount,
      sessionId: this.sessionId,
      createdAt: this.createdAt,
    });
  }

  advanceStatus(targetStatus: OrderStatus, actor: OrderActor, changedAt: string): void {
    if (this._status === "served") {
      throw new OrderAlreadyCompletedError();
    }
    if (this._status === "cancelled") {
      throw new OrderAlreadyCancelledError();
    }

    if (targetStatus === "cancelled") {
      this.cancel(actor, changedAt);
      return;
    }

    if (!OrderLifecyclePolicy.canTransition(this._status, targetStatus)) {
      throw new InvalidTransitionError(this._status, targetStatus);
    }

    OrderCancellationPolicy.assertCanAdvance(actor);

    const fromStatus = this._status;
    this._status = targetStatus;

    if (targetStatus === "ready" && this._readyAt == null) {
      this._readyAt = changedAt;
    }

    if (this.id == null) {
      throw new Error("Cannot advance unpersisted order");
    }

    this._events.push({
      type: "OrderStatusChanged",
      schemaVersion: ORDER_DOMAIN_EVENT_SCHEMA_VERSION,
      orderId: this.id,
      restaurantId: this.restaurantId,
      fromStatus,
      toStatus: targetStatus,
      changedAt,
      actor,
    });

    if (targetStatus === "ready") {
      this._events.push({
        type: "OrderReady",
        schemaVersion: ORDER_DOMAIN_EVENT_SCHEMA_VERSION,
        orderId: this.id,
        trackingToken: this.trackingToken,
        readyAt: this._readyAt!,
      });
    }

    if (targetStatus === "served") {
      this._events.push({
        type: "OrderCompleted",
        schemaVersion: ORDER_DOMAIN_EVENT_SCHEMA_VERSION,
        orderId: this.id,
        servedAt: changedAt,
      });
    }
  }

  cancel(actor: OrderActor, cancelledAt: string): void {
    if (this._status === "served") {
      throw new OrderAlreadyCompletedError();
    }
    if (this._status === "cancelled") {
      throw new OrderAlreadyCancelledError();
    }
    if (!OrderCancellationPolicy.canCancel(this._status, actor)) {
      throw new InvalidTransitionError(this._status, "cancelled");
    }

    const fromStatus = this._status;
    this._status = "cancelled";

    if (this.id == null) {
      throw new Error("Cannot cancel unpersisted order");
    }

    this._events.push({
      type: "OrderStatusChanged",
      schemaVersion: ORDER_DOMAIN_EVENT_SCHEMA_VERSION,
      orderId: this.id,
      restaurantId: this.restaurantId,
      fromStatus,
      toStatus: "cancelled",
      changedAt: cancelledAt,
      actor,
    });

    this._events.push({
      type: "OrderCancelled",
      schemaVersion: ORDER_DOMAIN_EVENT_SCHEMA_VERSION,
      orderId: this.id,
      cancelledAt,
      actor,
    });
  }

  pullDomainEvents(): OrderDomainEvent[] {
    return [...this._events];
  }

  clearDomainEvents(): void {
    this._events.length = 0;
  }

  isNew(): boolean {
    return this.id == null || this.id === 0;
  }

  snapshotForCreate() {
    return {
      restaurantId: this.restaurantId,
      tableId: this.tableId,
      tableNumber: this.tableNumber,
      sessionId: this.sessionId,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      notes: this.notes,
      totalAmount: this.totalAmount,
      orderNumber: this.orderNumber,
      trackingToken: this.trackingToken,
      status: this._status,
      lines: this._lines.map((line) => line.toProps()),
    };
  }

  isTerminal(): boolean {
    return isTerminalOrderStatus(this._status);
  }

  toPersistedProps(): PersistedOrderProps {
    if (this.id == null) {
      throw new Error("Order id required for persistence props");
    }
    return {
      id: this.id,
      restaurantId: this.restaurantId,
      tableId: this.tableId,
      tableNumber: this.tableNumber,
      sessionId: this.sessionId,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      notes: this.notes,
      totalAmount: this.totalAmount,
      orderNumber: this.orderNumber,
      trackingToken: this.trackingToken,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      status: this._status,
      readyAt: this._readyAt,
      lines: this._lines.map((line) => line.toProps()),
    };
  }
}
