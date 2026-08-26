import type { OrderLineInput } from "../../orderPricing";
import type { OrderDomainEvent } from "../domain/events/OrderDomainEvents";
import { Order } from "../domain/aggregate/Order";
import type {
  OrderRepository,
  SaveOrderOptions,
} from "../repositories/OrderRepository";
import type {
  OrderNumberPort,
  OrderPricingPort,
  TrackingTokenPort,
} from "../domain/ports/OrderPorts";
import {
  resolveItemNoteInput,
  resolveOrderNoteInput,
  validateItemNote,
  validateOrderNote,
} from "@shared/ordering-platform/orderingNotesContract";
import type { OrderingOrderIdentity } from "@shared/ordering-platform/orderingIdentityContract";
import {
  assertPlatformOrderIdentity,
  resolvePlaceOrderPersistFields,
  resolvePlaceOrderSessionId,
} from "@shared/ordering-platform/orderingIdentityContract";
import {
  assertOrderingChannelId,
  ORDERING_CHANNEL_CASHIER_POS,
} from "@shared/ordering-platform/orderingChannelRegistry";
import { resolveOrderActorFromSystem } from "./resolveOrderActor";
import { CASHIER_POS_INBOUND_STATUS } from "./cashierPosOrderLifecycle";
import {
  fulfilmentProjectionFromIdentity,
  fulfilmentProjectionFromLegacyTable,
} from "@shared/ordering-platform/orderFulfilmentProjection";
import { resolveOrderDisplayIdentity } from "../business-identity/application/OrderDisplayIdentityResolver";
import { timeOrderLifecyclePhase } from "../observability/orderLifecycleLatency";

export type PlaceOrderCommand = {
  restaurantId: number;
  /**
   * NON-TABLE-PLACE-ORDER-1 — canonical Order Identity when present.
   * Table ordering = Fulfilment Anchor type `table`.
   * Non-table anchors dual-write LEGACY_NON_TABLE sentinels to NOT NULL columns.
   */
  identity?: OrderingOrderIdentity;
  /**
   * Dual-compat with table Fulfilment Anchor / QR bridge.
   * Optional when `identity` is provided (derived via resolvePlaceOrderPersistFields).
   */
  tableId?: number;
  tableNumber?: number;
  sessionId?: number | null;
  /**
   * WAITER-ORDERING-FOUNDATION-1 — explicit BI scope (e.g. WAITER).
   * Does not change fulfilment; partitions daily display sequences only.
   */
  identityScope?: string | null;
  /**
   * ORDERING-CHANNEL-GOVERNANCE-1 — required OrderingChannelId before persistence.
   * No default, no post-hoc inference.
   */
  orderingChannel: string;
  customerName?: string | null;
  customerPhone?: string | null;
  /** Order Notes — legacy `notes` kept for backward compatibility. */
  orderNotes?: string | null;
  notes?: string | null;
  items: Array<
    OrderLineInput & {
      itemNotes?: string | null;
      /** ORDER-READ-MODIFIERS-PERSISTENCE-1 — dual-write only; no pricing change. */
      modifiers?: readonly string[] | null;
    }
  >;
};

export type PlaceOrderResult = {
  order: Order;
  events: OrderDomainEvent[];
  orderNumber: string;
  trackingToken: string;
  /** Server-resolved Business Display Identity (e.g. "T #001" / "K #001"). */
  displayReference: string;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
};

export class PlaceOrderNotesValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PlaceOrderNotesValidationError";
    this.code = code;
  }
}

export class PlaceOrderService {
  constructor(
    private readonly repository: OrderRepository,
    private readonly pricing: OrderPricingPort,
    private readonly orderNumbers: OrderNumberPort,
    private readonly trackingTokens: TrackingTokenPort
  ) {}

  async execute(
    command: PlaceOrderCommand,
    persist?: Pick<SaveOrderOptions, "afterPersistInTransaction">
  ): Promise<PlaceOrderResult> {
    const orderNoteResult = validateOrderNote(
      resolveOrderNoteInput({
        orderNotes: command.orderNotes,
        notes: command.notes,
      })
    );
    if (!orderNoteResult.ok) {
      throw new PlaceOrderNotesValidationError(orderNoteResult.code, orderNoteResult.message);
    }

    const orderingChannel = assertOrderingChannelId(command.orderingChannel);

    const normalizedItems = command.items.map((item, index) => {
      const itemNoteResult = validateItemNote(
        resolveItemNoteInput({
          itemNotes: item.itemNotes,
          notes: item.notes,
        })
      );
      if (!itemNoteResult.ok) {
        throw new PlaceOrderNotesValidationError(
          itemNoteResult.code,
          `Item ${index + 1}: ${itemNoteResult.message}`
        );
      }
      return {
        ...item,
        notes: itemNoteResult.value,
        modifiers: item.modifiers ?? [],
      };
    });

    const [{ lines, totalAmount }, orderNumber] = await Promise.all([
      timeOrderLifecyclePhase("pricing_ms", () =>
        this.pricing.resolveLines(command.restaurantId, normalizedItems)
      ),
      timeOrderLifecyclePhase("number_ms", () =>
        this.orderNumbers.allocate(command.restaurantId)
      ),
    ]);
    const trackingToken = this.trackingTokens.issue();
    const createdAt = new Date().toISOString();

    // NON-TABLE-PLACE-ORDER-1 — identity-driven persist dual-write.
    if (command.identity) {
      assertPlatformOrderIdentity(command.identity);
    }
    const tableFields = resolvePlaceOrderPersistFields({
      identity: command.identity,
      tableId: command.tableId,
      tableNumber: command.tableNumber,
    });
    const sessionId = resolvePlaceOrderSessionId({
      identity: command.identity,
      sessionId: command.sessionId,
    });

    // OPERATIONAL-FULFILMENT-PROJECTION-1 — stamp fulfilment facts for Order Read Model.
    // No PlaceOrder business-rule change; dual-write only.
    const fulfilment = command.identity
      ? fulfilmentProjectionFromIdentity(command.identity)
      : fulfilmentProjectionFromLegacyTable({
          tableNumber: tableFields.tableNumber,
          sessionId,
        });

    const order = Order.placeNew({
      restaurantId: command.restaurantId,
      tableId: tableFields.tableId,
      tableNumber: tableFields.tableNumber,
      sessionId,
      serviceMode: fulfilment.serviceMode,
      fulfilmentAnchorType: fulfilment.fulfilmentAnchorType,
      fulfilmentLabel: fulfilment.fulfilmentLabel,
      customerName: command.customerName ?? null,
      customerPhone: command.customerPhone ?? null,
      notes: orderNoteResult.value,
      totalAmount,
      orderNumber,
      trackingToken,
      createdAt,
      lines: lines.map((line) => ({
        menuItemId: line.menuItemId,
        nameAr: line.nameAr,
        nameEn: line.nameEn,
        unitPrice: line.price,
        quantity: line.quantity,
        notes: line.notes,
        modifiers: line.modifiers,
      })),
    });

    let events: OrderDomainEvent[] = [];
    const { order: persisted, businessIdentity } = await this.repository.save(order, {
      onPersisted: (p) => {
        p.recordCreated(p.id!);
        // CASHIER-CHECKOUT-LATENCY-AND-SPLIT-TENDER-1 — fold the existing
        // cashier_pos pending → preparing Accept into the first persist
        // transaction. Same transition and actor; no second HTTP-blocking save.
        // Domain event pull copies and does not drain — collect once after accept.
        if (
          orderingChannel === ORDERING_CHANNEL_CASHIER_POS &&
          p.status === "pending" &&
          p.id != null
        ) {
          const actor = resolveOrderActorFromSystem("cashier-pos-inbound-accept", {
            displayName: "Cashier POS",
            restaurantId: command.restaurantId,
          });
          p.advanceStatus(CASHIER_POS_INBOUND_STATUS, actor, createdAt);
        }
        events = p.pullDomainEvents();
        return events;
      },
      identityScope: command.identityScope,
      orderingChannel,
      createRowStatus:
        orderingChannel === ORDERING_CHANNEL_CASHIER_POS
          ? CASHIER_POS_INBOUND_STATUS
          : undefined,
      afterPersistInTransaction: persist?.afterPersistInTransaction,
      // Payment UI does not show customer-facing P#; skip sequence alloc on this HTTP.
      skipBusinessIdentityAllocation:
        orderingChannel === ORDERING_CHANNEL_CASHIER_POS,
    });
    persisted.clearDomainEvents();

    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const displayReference = resolveOrderDisplayIdentity({
      orderNumber,
      businessDay: businessIdentity?.businessDay ?? null,
      dailyDisplayNumber: businessIdentity?.dailyDisplayNumber ?? null,
      identityScope:
        businessIdentity?.identityScope ?? command.identityScope ?? null,
      fulfilmentAnchorType: fulfilment.fulfilmentAnchorType,
      serviceMode: fulfilment.serviceMode,
    }).displayReference;

    return {
      order: persisted,
      events,
      orderNumber,
      trackingToken,
      displayReference,
      totalAmount,
      itemCount,
      createdAt,
    };
  }
}
