/**
 * POS-SALE-ORDER-IMPLEMENTATION-1
 * POS Sale is a command into the canonical Order Domain.
 * POS does not own Order, Check, Settlement, or pricing.
 */

import { createHash } from "node:crypto";
import { createStationFulfilmentAnchor } from "@shared/ordering-platform/orderingIdentityContract";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { opsLog } from "../../_core/opsLog";
import { findSessionById } from "../../diningSession/sessionRepository";
import type { IdentityPlaceOrderService } from "../../order/application/IdentityPlaceOrderService";
import { runOrderCommand } from "../../order/application/mapOrderDomainError";
import { resolveOrderDisplayIdentity } from "../../order/business-identity/application/OrderDisplayIdentityResolver";
import {
  collectOrderLifecyclePhases,
  getOrderLifecycleLatencyContext,
  timeOrderLifecyclePhase,
} from "../../order/observability/orderLifecycleLatency";
import type { SaveOrderResult } from "../../order/repositories/OrderRepository";
import { assertRestaurantPosScope } from "../authorization/assertRestaurantPosScope";
import type { PosSaleIdempotencyRecord, PosSaleIdempotencyStore } from "../infrastructure/PosSaleIdempotencyStore";
import { POS_SALE_IDEMPOTENCY_UNASSIGNED_CHECK_ID } from "../infrastructure/PosSaleIdempotencyStore";
import {
  PosSaleIdempotencyConflictError,
  PosSaleIdempotencyUniqueCollisionError,
} from "../infrastructure/posPersistenceErrors";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import { PosAccessService } from "./PosAccessService";
import type { SelectUser } from "../../../drizzle/schema";

export class PosSaleError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PosSaleError";
    this.code = code;
  }
}

export type PosSaleLineInput = {
  menuItemId: number;
  quantity: number;
  notes?: string | null;
  modifiers?: readonly string[] | null;
};

export type PosSaleCommand = {
  restaurantId: number;
  terminalId: string;
  items: readonly PosSaleLineInput[];
  notes?: string | null;
  sessionId?: number | null;
  idempotencyKey: string;
};

export type PosSaleCheckLine = {
  description: string;
  quantity: number;
  netAmount: string;
  originOrderItemId: number | null;
};

export type PosSaleMoney = {
  subtotal: string;
  taxAmount: string;
  grandTotal: string;
  billDiscountAmount: string;
};

export type PosSaleResult = {
  orderId: number;
  orderNumber: string;
  trackingToken: string;
  displayReference: string;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
  orderingChannel: typeof ORDERING_CHANNEL_CASHIER_POS;
  terminalId: string;
  cashierUserId: number;
  replayed: boolean;
  money: PosSaleMoney;
  lines: readonly PosSaleCheckLine[];
};

export type PosSaleSessionLookup = (
  sessionId: number
) => Promise<{ restaurantId: number } | null>;

const AUTH_DENIED_CODES = new Set([
  "pos_permission_denied",
  "terminal_not_found",
  "terminal_foreign",
  "terminal_inactive",
  "entitlement_unavailable",
]);

/**
 * POS-SALE-PERSISTENCE-LATENCY-INSTRUMENTATION-1
 * Stages copied onto `pos_sale_created`. Nested vs exclusive:
 * - persistExclusiveMs: saleStartedAt → this log (enclosing, unchanged)
 * - idempotency_wait_ms: `await previous` inside runExclusive (nested)
 * - idempotency_get_ms: existing `idempotency.get` only (nested)
 * - pricing_ms: PlaceOrder `resolveAuthoritativeOrderLines` / resolveLines (nested)
 * - number_ms: PlaceOrder `generateOrderNumber` / allocate (nested; outside persist txn)
 * - persist_ms: insertTransactional lock→insert→lines→BI→Accept (nested; before outbox)
 *   - restaurant_lock_ms / order_insert_ms / order_lines_ms / accept_update_ms (nested in persist_ms)
 * - outbox_ms: appendInTransaction only (sibling of persist_ms)
 * - idempotency_put_ms: afterPersistInTransaction / putInTransaction (sibling; after outbox)
 * - commit_ms: after txn callback until db.transaction resolves (sibling)
 * Business Identity durationMs remains on business_identity_assignment_completed (inside persist_ms).
 */
const POS_SALE_PERSISTENCE_STAGE_KEYS = [
  "idempotency_wait_ms",
  "idempotency_get_ms",
  "pricing_ms",
  "number_ms",
  "persist_ms",
  "restaurant_lock_ms",
  "order_insert_ms",
  "order_lines_ms",
  "accept_update_ms",
  "outbox_ms",
  "idempotency_put_ms",
  "commit_ms",
] as const;

type PosSalePersistenceStageKey = (typeof POS_SALE_PERSISTENCE_STAGE_KEYS)[number];

function readPosSalePersistenceStages(): Record<
  PosSalePersistenceStageKey,
  number | null
> {
  const empty = Object.fromEntries(
    POS_SALE_PERSISTENCE_STAGE_KEYS.map((key) => [key, null])
  ) as Record<PosSalePersistenceStageKey, number | null>;
  try {
    const phases = getOrderLifecycleLatencyContext()?.phaseDurations;
    if (!phases) return empty;
    const next = { ...empty };
    for (const key of POS_SALE_PERSISTENCE_STAGE_KEYS) {
      const value = phases[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        next[key] = value;
      }
    }
    return next;
  } catch {
    return empty;
  }
}

function fingerprintOf(command: {
  restaurantId: number;
  terminalId: string;
  userId: number;
  items: readonly PosSaleLineInput[];
  notes?: string | null;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        restaurantId: command.restaurantId,
        terminalId: command.terminalId,
        userId: command.userId,
        notes: command.notes ?? null,
        items: command.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes ?? null,
          modifiers: item.modifiers ?? [],
        })),
      })
    )
    .digest("hex");
}

function replaySaleResult(
  existing: PosSaleIdempotencyRecord,
  context: { terminalId: string; userId: number }
): PosSaleResult {
  return {
    orderId: existing.orderId,
    orderNumber: existing.orderNumber,
    trackingToken: existing.trackingToken,
    displayReference: existing.displayReference,
    totalAmount: existing.totalAmount,
    itemCount: existing.itemCount,
    createdAt: existing.createdAt,
    orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
    terminalId: context.terminalId,
    cashierUserId: context.userId,
    replayed: true,
    money: {
      subtotal: existing.subtotal,
      taxAmount: existing.taxAmount,
      grandTotal: existing.grandTotal,
      billDiscountAmount: existing.billDiscountAmount,
    },
    lines: existing.lines,
  };
}

type InvoiceLineSource = {
  id?: number;
  nameAr?: string;
  quantity: number;
  unitPrice?: string;
  lineTotal?: () => number;
};

function invoiceLinesFromOrder(order: SaveOrderResult["order"]): readonly InvoiceLineSource[] {
  const record = order as {
    lines?: readonly InvoiceLineSource[];
    toProps?: () => { lines: readonly InvoiceLineSource[] };
  };
  if (Array.isArray(record.lines) && record.lines.length > 0) {
    return record.lines;
  }
  if (typeof record.toProps === "function") {
    return record.toProps().lines;
  }
  return [];
}

function invoiceFromOrder(order: SaveOrderResult["order"]): {
  money: PosSaleMoney;
  lines: readonly PosSaleCheckLine[];
} {
  const sources = invoiceLinesFromOrder(order);
  const lines = sources.map((line) => {
    let netAmount = order.totalAmount;
    if (typeof line.lineTotal === "function") {
      netAmount = line.lineTotal().toFixed(2);
    } else if (line.unitPrice != null && line.unitPrice !== "") {
      netAmount = (Number.parseFloat(line.unitPrice) * line.quantity).toFixed(2);
    }
    return {
      description: line.nameAr?.trim() ? line.nameAr : "item",
      quantity: line.quantity,
      netAmount,
      originOrderItemId: line.id ?? null,
    };
  });
  return {
    money: {
      subtotal: order.totalAmount,
      taxAmount: "0.00",
      grandTotal: order.totalAmount,
      billDiscountAmount: "0.00",
    },
    lines,
  };
}

function assertIdempotencyKey(key: string): void {
  if (!key.trim() || key.length < 8 || key.length > 128) {
    throw new PosSaleError("invalid_idempotency_key", "Idempotency key is required");
  }
}

function assertSaleItems(items: readonly PosSaleLineInput[]): void {
  if (items.length === 0) {
    throw new PosSaleError("empty_sale", "Sale must contain at least one item");
  }
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!Number.isInteger(item.menuItemId) || item.menuItemId <= 0) {
      throw new PosSaleError("invalid_item", `Item ${index + 1} is invalid`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new PosSaleError(
        item.quantity === 0 ? "zero_quantity" : "invalid_quantity",
        `Item ${index + 1} quantity must be a positive integer`
      );
    }
    if (item.modifiers && !Array.isArray(item.modifiers)) {
      throw new PosSaleError("invalid_modifier", `Item ${index + 1} modifiers are invalid`);
    }
    if (
      item.modifiers?.some(
        (mod: string) => typeof mod !== "string" || !mod.trim()
      )
    ) {
      throw new PosSaleError("invalid_modifier", `Item ${index + 1} has an invalid modifier`);
    }
  }
}

export class PosSaleService {
  constructor(
    private readonly grants: PosPermissionGrantStore,
    private readonly access: PosAccessService,
    private readonly placeOrder: IdentityPlaceOrderService,
    private readonly idempotency: PosSaleIdempotencyStore,
    private readonly sessionLookup: PosSaleSessionLookup = findSessionById
  ) {}

  async create(input: {
    user: SelectUser;
    command: PosSaleCommand;
  }): Promise<PosSaleResult> {
    assertIdempotencyKey(input.command.idempotencyKey);

    const scope = await assertRestaurantPosScope(
      { user: input.user },
      input.command.restaurantId,
      this.grants,
      "pos.sale.create"
    );
    const decision = await this.access.resolvePosTerminalAccess({
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      userId: input.user.id,
      requiredPermission: "SALE_CREATE",
      restaurantScope: scope.kind,
    });
    if (!decision.allowed || !decision.context) {
      throw new PosSaleError(
        AUTH_DENIED_CODES.has(decision.reasonCode)
          ? decision.reasonCode
          : "pos_permission_denied",
        "غير مصرح بالوصول"
      );
    }
    const context = decision.context;
    if (
      !context.permissions.includes("POS_ACCESS") ||
      !context.permissions.includes("SALE_CREATE")
    ) {
      throw new PosSaleError("pos_permission_denied", "غير مصرح بالوصول");
    }

    assertSaleItems(input.command.items);

    if (input.command.sessionId != null) {
      const session = await this.sessionLookup(input.command.sessionId);
      if (!session || session.restaurantId !== context.restaurantId) {
        throw new PosSaleError(
          "invalid_session",
          "Session does not belong to this restaurant"
        );
      }
    }

    const fingerprint = fingerprintOf({
      restaurantId: context.restaurantId,
      terminalId: context.terminalId,
      userId: context.userId,
      items: input.command.items,
      notes: input.command.notes,
    });
    const idempotencyKey = {
      restaurantId: context.restaurantId,
      terminalId: context.terminalId,
      userId: context.userId,
      idempotencyKey: input.command.idempotencyKey,
    };

    const saleStartedAt = Date.now();
    return collectOrderLifecyclePhases(() =>
      this.idempotency.runExclusive(idempotencyKey, async () => {
        const existing = await timeOrderLifecyclePhase("idempotency_get_ms", () =>
          this.idempotency.get(idempotencyKey)
        );
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          throw new PosSaleError(
            "idempotency_conflict",
            "Idempotency key was already used for a different sale"
          );
        }
        return replaySaleResult(existing, context);
      }

      const placed = await (async () => {
        try {
          // ORDER-LIFECYCLE-LATENCY-REMEDIATION-1 — POS sale HTTP must not
          // await runOrderEventRelayBatch (up to 50 pending outbox events,
          // including unrelated backlog). Relay still runs via
          // scheduleOrderEventRelay (setImmediate). Persist + idempotency
          // stay inside the Order save transaction.
          return await runOrderCommand(
            () =>
              this.placeOrder.execute(
                {
                  restaurantId: context.restaurantId,
                  serviceMode: "counter",
                  fulfilmentAnchor: createStationFulfilmentAnchor({
                    stationId: context.terminalId,
                    fulfilmentLabel: context.terminalId,
                  }),
                  identityScope: "POS",
                  orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
                  notes: input.command.notes,
                  items: input.command.items.map((item) => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    notes: item.notes,
                    modifiers: item.modifiers,
                  })),
                },
                {
                  afterPersistInTransaction: async (tx, result) => {
                    const orderId = result.order.id;
                    if (orderId == null) {
                      throw new PosSaleError(
                        "order_create_failed",
                        "Order was not persisted"
                      );
                    }
                    await timeOrderLifecyclePhase("idempotency_put_ms", () =>
                      this.persistSaleMappingInTransaction(tx, result, {
                        restaurantId: context.restaurantId,
                        terminalId: context.terminalId,
                        userId: context.userId,
                        idempotencyKey: input.command.idempotencyKey,
                        fingerprint,
                      })
                    );
                  },
                  // Post-commit ensureCheckForOrder stays off the cashier HTTP
                  // path. OPEN Check is not part of sale.create.
                  enrollCheck: false,
                }
              ),
            { awaitRelay: false }
          );
        } catch (error) {
          if (
            error instanceof PosSaleIdempotencyUniqueCollisionError ||
            error instanceof PosSaleIdempotencyConflictError
          ) {
            const winner = await this.idempotency.get(idempotencyKey);
            if (winner && winner.fingerprint === fingerprint) {
              return replaySaleResult(winner, context);
            }
            throw new PosSaleError(
              "idempotency_conflict",
              "Idempotency key was already used for a different sale"
            );
          }
          throw error;
        }
      })();

      if (!("order" in placed)) {
        return placed;
      }

      const orderId = placed.order.id;
      if (orderId == null) {
        throw new PosSaleError("order_create_failed", "Sale was not recorded");
      }
      const { money, lines } = invoiceFromOrder(placed.order);

      opsLog({
        type: "pos_sale_created",
        category: "ORDER",
        severity: "info",
        ts: placed.createdAt,
        actorId: context.userId,
        restaurantId: context.restaurantId,
        action: "pos.sale.create",
        metadata: {
          orderId,
          terminalId: context.terminalId,
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
          sessionPersistence: placed.sessionPersistence,
          persistExclusiveMs: Date.now() - saleStartedAt,
          ...readPosSalePersistenceStages(),
        },
      });

      return {
        orderId,
        orderNumber: placed.orderNumber,
        trackingToken: placed.trackingToken,
        displayReference: placed.displayReference,
        totalAmount: placed.totalAmount,
        itemCount: placed.itemCount,
        createdAt: placed.createdAt,
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        terminalId: context.terminalId,
        cashierUserId: context.userId,
        replayed: false,
        money,
        lines,
      };
    })
    );
  }

  private async persistSaleMappingInTransaction(
    tx: unknown,
    result: SaveOrderResult,
    input: {
      restaurantId: number;
      terminalId: string;
      userId: number;
      idempotencyKey: string;
      fingerprint: string;
    }
  ): Promise<void> {
    const orderId = result.order.id;
    if (orderId == null) {
      throw new PosSaleError("order_create_failed", "Order was not persisted");
    }
    const { money, lines } = invoiceFromOrder(result.order);
    const displayReference = resolveOrderDisplayIdentity({
      orderNumber: result.order.orderNumber,
      businessDay: result.businessIdentity?.businessDay ?? null,
      dailyDisplayNumber: result.businessIdentity?.dailyDisplayNumber ?? null,
      identityScope: result.businessIdentity?.identityScope ?? "POS",
      fulfilmentAnchorType: result.order.fulfilmentAnchorType,
      serviceMode: result.order.serviceMode,
    }).displayReference;
    await this.idempotency.putInTransaction(tx, {
      restaurantId: input.restaurantId,
      terminalId: input.terminalId,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      fingerprint: input.fingerprint,
      orderId,
      orderNumber: result.order.orderNumber,
      trackingToken: result.order.trackingToken,
      displayReference,
      totalAmount: result.order.totalAmount,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      checkId: POS_SALE_IDEMPOTENCY_UNASSIGNED_CHECK_ID,
      subtotal: money.subtotal,
      taxAmount: money.taxAmount,
      grandTotal: money.grandTotal,
      billDiscountAmount: money.billDiscountAmount,
      lines,
      createdAt: result.order.createdAt,
    });
  }
}
