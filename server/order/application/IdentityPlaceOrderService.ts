/**
 * NON-TABLE-PLACE-ORDER-1 — identity-driven PlaceOrder orchestration.
 *
 * Canonical path:
 *   OrderingOrderIdentity facts → resolveOperationalSession → PlaceOrderService
 *
 * Table Waiter first Order may defer Session resolution onto the persist
 * transaction (WAITER-ATTACH-MUST-NOT-OPEN-SESSION-1). No channel-specific
 * PlaceOrder forks. QR production continues to use order.create separately.
 */

import type { OrderLineInput } from "../../orderPricing";
import {
  assertPlatformOrderIdentity,
  createOrderIdentity,
  type OrderingFulfilmentAnchor,
  type OrderingOrderIdentity,
  type OrderingServiceMode,
} from "@shared/ordering-platform/orderingIdentityContract";
import { sessionAnchorFromFulfilmentAnchor } from "@shared/operational-session";
import { isCashierPosOrderingChannel } from "./cashierPosOrderLifecycle";
import {
  ensureCheckForOrder,
  resolveOperationalSession,
} from "../../operational-session";
import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import {
  PlaceOrderService,
  PlaceOrderValidationError,
  type PlaceOrderResult,
} from "./PlaceOrderService";
import type { SaveOrderOptions } from "../repositories/OrderRepository";
import type { SessionDbClient } from "../../diningSession/sessionRepository";

export type IdentityPlaceOrderCommand = {
  restaurantId: number;
  serviceMode: OrderingServiceMode;
  fulfilmentAnchor: OrderingFulfilmentAnchor;
  sessionToken?: string;
  /** WAITER-ORDERING-FOUNDATION-1 — explicit BI scope stamp (e.g. WAITER). */
  identityScope?: string | null;
  /**
   * ORDERING-CHANNEL-GOVERNANCE-1 — required OrderingChannelId before persistence.
   */
  orderingChannel: string;
  customerName?: string | null;
  customerPhone?: string | null;
  orderNotes?: string | null;
  notes?: string | null;
  items: Array<
    OrderLineInput & {
      itemNotes?: string | null;
      modifiers?: readonly string[] | null;
    }
  >;
};

export type IdentityPlaceOrderResult = PlaceOrderResult & {
  identity: OrderingOrderIdentity;
  sessionPersistence: "persistent" | "ephemeral";
};

export class IdentityPlaceOrderService {
  constructor(private readonly placeOrder: PlaceOrderService) {}

  /**
   * Resolve Operational Session from Fulfilment Anchor, stamp identity, place order.
   */
  async execute(
    command: IdentityPlaceOrderCommand,
    persist?: Pick<
      SaveOrderOptions,
      "afterPersistInTransaction" | "skipBusinessIdentityAllocation"
    > & {
      /**
       * Default true (CHECK-GENERALIZATION-M5). POS sale HTTP sets false so
       * post-commit ensureCheckForOrder is skipped. Cashier OPEN Check is not
       * part of sale.create; Confirm commits Collection Fact from the Order.
       */
      enrollCheck?: boolean;
      /**
       * WAITER-ATTACH-MUST-NOT-OPEN-SESSION-1 — table Session opens on the
       * Order persist transaction. Do not pre-commit Session/Check.
       */
      resolveTableSessionInTransaction?: boolean;
    }
  ): Promise<IdentityPlaceOrderResult> {
    const draftIdentity = createOrderIdentity({
      serviceMode: command.serviceMode,
      fulfilmentAnchor: command.fulfilmentAnchor,
      sessionId: null,
      sessionToken: null,
    });
    assertPlatformOrderIdentity(draftIdentity);

    const cashierPos = isCashierPosOrderingChannel(command.orderingChannel);
    if (cashierPos && command.fulfilmentAnchor.anchorType === "table") {
      throw new PlaceOrderValidationError(
        "CASHIER_POS_TABLE_FORBIDDEN",
        "Cashier POS orders cannot join a Dining Session or table"
      );
    }

    const deferTableSession =
      persist?.resolveTableSessionInTransaction === true &&
      command.fulfilmentAnchor.anchorType === "table" &&
      !cashierPos;

    const sessionResult = cashierPos
      ? {
          session: null,
          created: false,
          persistence: "ephemeral" as const,
        }
      : deferTableSession
        ? {
            session: null,
            created: false,
            persistence: "persistent" as const,
          }
        : await resolveOperationalSession({
            restaurantId: command.restaurantId,
            anchor: sessionAnchorFromFulfilmentAnchor(command.fulfilmentAnchor),
            sessionToken: command.sessionToken,
          });

    let resolvedSessionToken: string | null =
      sessionResult.session?.sessionToken ?? null;
    let resolvedPersistence = sessionResult.persistence;

    const identity = createOrderIdentity({
      serviceMode: command.serviceMode,
      fulfilmentAnchor: command.fulfilmentAnchor,
      sessionId: sessionResult.session?.id ?? null,
      sessionToken: resolvedSessionToken,
    });

    const placeCommand = {
      restaurantId: command.restaurantId,
      identity,
      // Legacy dual-compat fields derived inside PlaceOrderService from identity.
      tableId:
        command.fulfilmentAnchor.anchorType === "table"
          ? command.fulfilmentAnchor.tableId
          : undefined,
      tableNumber:
        command.fulfilmentAnchor.anchorType === "table"
          ? command.fulfilmentAnchor.tableNumber
          : undefined,
      sessionId: identity.operationalSession.sessionId,
      identityScope: command.identityScope,
      orderingChannel: command.orderingChannel,
      customerName: command.customerName,
      customerPhone: command.customerPhone,
      orderNotes: command.orderNotes,
      notes: command.notes,
      items: command.items,
    };
    const enrollCheck = persist?.enrollCheck !== false;
    const resolveSessionInTransaction = deferTableSession
      ? async (tx: unknown) => {
          const opened = await resolveOperationalSession(
            {
              restaurantId: command.restaurantId,
              anchor: sessionAnchorFromFulfilmentAnchor(command.fulfilmentAnchor),
              sessionToken: command.sessionToken,
            },
            tx as SessionDbClient
          );
          if (!opened.session) {
            throw new Error(
              "Table Operational Session resolution returned no session"
            );
          }
          resolvedSessionToken = opened.session.sessionToken;
          resolvedPersistence = opened.persistence;
          return { sessionId: opened.session.id };
        }
      : undefined;
    const saveOpts = persist
      ? {
          afterPersistInTransaction: persist.afterPersistInTransaction,
          skipBusinessIdentityAllocation: persist.skipBusinessIdentityAllocation,
          ...(resolveSessionInTransaction
            ? { resolveSessionInTransaction }
            : {}),
        }
      : resolveSessionInTransaction
        ? { resolveSessionInTransaction }
        : undefined;
    const result = saveOpts
      ? await this.placeOrder.execute(placeCommand, saveOpts)
      : await this.placeOrder.execute(placeCommand);

    const placedIdentity = deferTableSession
      ? createOrderIdentity({
          serviceMode: command.serviceMode,
          fulfilmentAnchor: command.fulfilmentAnchor,
          sessionId: result.order.sessionId,
          sessionToken: resolvedSessionToken,
        })
      : identity;

    // CHECK-GENERALIZATION-M5 — sessionless / ephemeral channels enroll into Check + Membership.
    // Table Session path keeps Session Check create + dual-write (avoid duplicate sessionless Check).
    // POS cashier enrolls OPEN Check inside the Order persist transaction (Stage 1).
    // enrollCheck: false only skips this post-commit ensureCheckForOrder call.
    if (
      enrollCheck &&
      (resolvedPersistence === "ephemeral" ||
        placedIdentity.operationalSession.sessionId == null)
    ) {
      try {
        const orderId = result.order.id;
        if (orderId == null) {
          throw new Error("Persisted order identity is required for Check enrollment");
        }
        await ensureCheckForOrder({
          restaurantId: command.restaurantId,
          orderId,
        });
      } catch (e) {
        opsLog({
          type: OPS_EVENT.check_membership_dual_write_failed,
          category: "ORDER",
          severity: "error",
          ts: new Date().toISOString(),
          restaurantId: command.restaurantId,
          procedure: "IdentityPlaceOrderService.ensureCheckForOrder",
          metadata: {
            orderId: result.order.id,
            error: e instanceof Error ? e.message : String(e),
          },
        });
      }
    }

    return {
      ...result,
      identity: placedIdentity,
      sessionPersistence: resolvedPersistence,
    };
  }
}
