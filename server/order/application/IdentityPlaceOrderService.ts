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
  ensureSessionlessCheckForOrderInTransaction,
  resolveOperationalSession,
} from "../../operational-session";
import {
  PlaceOrderService,
  PlaceOrderValidationError,
  type PlaceOrderResult,
} from "./PlaceOrderService";
import type {
  SaveOrderOptions,
  SaveOrderResult,
} from "../repositories/OrderRepository";
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
  /** SALE-CUSTOMER-LINK-1 — optional Global Customer id. */
  customerId?: number | null;
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
       * Default true (CHECK-GENERALIZATION-M5). Sessionless / ephemeral place
       * enrolls Check on the Order persist transaction.
       * POS sale HTTP sets false: Cashier OPEN Check is not part of sale.create.
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
      customerId: command.customerId,
      orderNotes: command.orderNotes,
      notes: command.notes,
      items: command.items,
    };
    const enrollCheck = persist?.enrollCheck !== false;
    // SELF-ORDER-CHECK-IN-ORDER-TRANSACTION-HARDENING-1 — sessionless Check
    // joins the Order persist transaction. Table Session opens its own Check.
    // enrollCheck: false skips enrollment (POS sale.create).
    const shouldEnrollSessionlessCheck =
      enrollCheck &&
      !deferTableSession &&
      (resolvedPersistence === "ephemeral" ||
        identity.operationalSession.sessionId == null);
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
    const afterPersistInTransaction = shouldEnrollSessionlessCheck
      ? async (tx: unknown, saved: SaveOrderResult) => {
          if (persist?.afterPersistInTransaction) {
            await persist.afterPersistInTransaction(tx, saved);
          }
          const orderId = saved.order.id;
          if (orderId == null) {
            throw new Error(
              "Persisted order identity is required for Check enrollment"
            );
          }
          await ensureSessionlessCheckForOrderInTransaction(
            { restaurantId: command.restaurantId, orderId },
            tx as SessionDbClient
          );
        }
      : persist?.afterPersistInTransaction;
    const saveOpts =
      persist || resolveSessionInTransaction || shouldEnrollSessionlessCheck
        ? {
            ...(afterPersistInTransaction
              ? { afterPersistInTransaction }
              : {}),
            skipBusinessIdentityAllocation:
              persist?.skipBusinessIdentityAllocation,
            ...(resolveSessionInTransaction
              ? { resolveSessionInTransaction }
              : {}),
          }
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

    return {
      ...result,
      identity: placedIdentity,
      sessionPersistence: resolvedPersistence,
    };
  }
}
