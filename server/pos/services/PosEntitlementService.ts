/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1
 * Derives Effective POS Entitlement from checkLimit / Live Plan limits.
 */

import { POS_TERMINALS_LIMIT_KEY } from "@shared/commercial-catalog/contracts";
import {
  deriveEffectivePosEntitlement,
  isProvisionedLifecycle,
  type EffectivePosEntitlement,
} from "@shared/pos";
import { checkLimit } from "../../subscription-runtime";
import { getRestaurantById } from "../../db";
import type { PosTerminalStore } from "../infrastructure/PosTerminalStore";

export class PosEntitlementDeniedError extends Error {
  readonly code = "POS_ENTITLEMENT_DENIED";
  constructor(message: string) {
    super(message);
    this.name = "PosEntitlementDeniedError";
  }
}

export class PosEntitlementService {
  constructor(private readonly store: PosTerminalStore) {}

  async resolve(
    restaurantId: number,
    now?: Date
  ): Promise<EffectivePosEntitlement> {
    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant) {
      throw new PosEntitlementDeniedError("restaurant_not_found");
    }
    const terminals = await this.store.listByRestaurant(restaurantId);
    const provisioned = terminals.filter((t) =>
      isProvisionedLifecycle(t.lifecycle)
    ).length;
    const decision = await checkLimit({
      ownerId: restaurant.userId,
      limitKey: POS_TERMINALS_LIMIT_KEY,
      proposedTotal: provisioned,
      now,
    });
    const included =
      decision.policy === "unlimited" ? null : (decision.cap ?? 0);
    const source =
      decision.policy === "unlimited"
        ? "owner_unlimited"
        : included === 0
          ? "missing_fail_closed"
          : "live_plan_limit";
    return deriveEffectivePosEntitlement({
      included,
      provisioned,
      source,
    });
  }

  async assertProvisioningAllowed(
    restaurantId: number,
    now?: Date
  ): Promise<EffectivePosEntitlement> {
    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant) {
      throw new PosEntitlementDeniedError("restaurant_not_found");
    }
    const terminals = await this.store.listByRestaurant(restaurantId);
    const provisioned = terminals.filter((t) =>
      isProvisionedLifecycle(t.lifecycle)
    ).length;
    const decision = await checkLimit({
      ownerId: restaurant.userId,
      limitKey: POS_TERMINALS_LIMIT_KEY,
      proposedTotal: provisioned + 1,
      now,
    });
    if (!decision.allowed) {
      throw new PosEntitlementDeniedError(decision.reasonCode);
    }
    return this.resolve(restaurantId, now);
  }
}
