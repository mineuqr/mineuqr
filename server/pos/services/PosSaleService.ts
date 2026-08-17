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
import type { SaveOrderResult } from "../../order/repositories/OrderRepository";
import { assertRestaurantPosScope } from "../authorization/assertRestaurantPosScope";
import type { PosSaleIdempotencyStore } from "../infrastructure/PosSaleIdempotencyStore";
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
    return this.idempotency.runExclusive(idempotencyKey, async () => {
      const existing = await this.idempotency.get(idempotencyKey);
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          throw new PosSaleError(
            "idempotency_conflict",
            "Idempotency key was already used for a different sale"
          );
        }
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
        };
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
                    await this.persistSaleMappingInTransaction(
                      tx,
                      result,
                      {
                        restaurantId: context.restaurantId,
                        terminalId: context.terminalId,
                        userId: context.userId,
                        idempotencyKey: input.command.idempotencyKey,
                        fingerprint,
                      }
                    );
                  },
                  // Check enrollment is not required for sale success (errors
                  // are already swallowed). Awaiting it blocks the cashier
                  // HTTP response; Cashier orchestrates pos.check.intake.
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
              return {
                orderId: winner.orderId,
                orderNumber: winner.orderNumber,
                trackingToken: winner.trackingToken,
                displayReference: winner.displayReference,
                totalAmount: winner.totalAmount,
                itemCount: winner.itemCount,
                createdAt: winner.createdAt,
                orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
                terminalId: context.terminalId,
                cashierUserId: context.userId,
                replayed: true,
              };
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

      // CASHIER-CHECKOUT-PRINT-FLOW-1 — mapping is already written in the
      // Order save transaction. A post-commit idempotency.get is another
      // round trip on the cashier HTTP path and is not required for safety.
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
      };
    });
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
      itemCount: result.order.lines.reduce((sum, line) => sum + line.quantity, 0),
      createdAt: result.order.createdAt,
    });
  }
}
