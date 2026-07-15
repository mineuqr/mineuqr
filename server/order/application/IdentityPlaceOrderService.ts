/**
 * NON-TABLE-PLACE-ORDER-1 — identity-driven PlaceOrder orchestration.
 *
 * Canonical path:
 *   OrderingOrderIdentity facts → resolveOperationalSession → PlaceOrderService
 *
 * Channel-agnostic. No channel-specific PlaceOrder forks. No fake tables.
 * QR production continues to use order.create (table) separately.
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
import { resolveOperationalSession } from "../../operational-session";
import {
  PlaceOrderService,
  type PlaceOrderResult,
} from "./PlaceOrderService";

export type IdentityPlaceOrderCommand = {
  restaurantId: number;
  serviceMode: OrderingServiceMode;
  fulfilmentAnchor: OrderingFulfilmentAnchor;
  sessionToken?: string;
  /** WAITER-ORDERING-FOUNDATION-1 — explicit BI scope stamp (e.g. WAITER). */
  identityScope?: string | null;
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
    command: IdentityPlaceOrderCommand
  ): Promise<IdentityPlaceOrderResult> {
    const draftIdentity = createOrderIdentity({
      serviceMode: command.serviceMode,
      fulfilmentAnchor: command.fulfilmentAnchor,
      sessionId: null,
      sessionToken: null,
    });
    assertPlatformOrderIdentity(draftIdentity);

    const sessionAnchor = sessionAnchorFromFulfilmentAnchor(
      command.fulfilmentAnchor
    );
    const sessionResult = await resolveOperationalSession({
      restaurantId: command.restaurantId,
      anchor: sessionAnchor,
      sessionToken: command.sessionToken,
    });

    const identity = createOrderIdentity({
      serviceMode: command.serviceMode,
      fulfilmentAnchor: command.fulfilmentAnchor,
      sessionId: sessionResult.session?.id ?? null,
      sessionToken: sessionResult.session?.sessionToken ?? null,
    });

    const result = await this.placeOrder.execute({
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
      customerName: command.customerName,
      customerPhone: command.customerPhone,
      orderNotes: command.orderNotes,
      notes: command.notes,
      items: command.items,
    });

    return {
      ...result,
      identity,
      sessionPersistence: sessionResult.persistence,
    };
  }
}
