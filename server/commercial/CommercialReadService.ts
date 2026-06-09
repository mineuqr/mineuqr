import { getAllUsers, getSubscriptionPlanById, getSubscriptionsByUser } from "../db";
import { pickUserLevelSubscription } from "../subscriptionResolver";
import type { CommercialAuthority } from "./dto/commercialAuthority";
import type { OwnerCommercialState } from "./commercialReadSlices";
import { getCommercialEntitlements } from "./getCommercialEntitlements";
import { mapToCommercialAuthority } from "./mapToCommercialAuthority";
import {
  COMMERCIAL_POPULATION_CLASSIFICATION,
  isCommercialPopulationMember,
} from "./commercialPopulation";

/**
 * EXEC-1 — read-only canonical commercial authority facade.
 *
 * Resolves: Owner → account subscription (restaurantId = 0) → plan → entitlements
 * via getCommercialEntitlements only. No legacy authority paths. No writes.
 *
 * Not wired to routers or dashboard consumers in EXEC-1.
 */
export class CommercialReadService {
  /**
   * Returns fully resolved commercial authority for one owner.
   */
  async getAuthorityForOwner(
    ownerId: number,
    now: Date = new Date()
  ): Promise<CommercialAuthority> {
    return this.getOwnerCommercialState(ownerId, now);
  }

  /** AR-4 Category A — canonical owner commercial state. */
  async getOwnerCommercialState(
    ownerId: number,
    now: Date = new Date()
  ): Promise<OwnerCommercialState> {
    const result = await getCommercialEntitlements(ownerId, now);

    const rows = await getSubscriptionsByUser(ownerId);
    const canonicalRow = pickUserLevelSubscription(rows, now);

    const catalogPlan =
      canonicalRow != null
        ? await getSubscriptionPlanById(canonicalRow.planId)
        : null;

    return mapToCommercialAuthority(result, canonicalRow, catalogPlan, now);
  }

  /** AR-4 Category A — batch read (same semantics as single). */
  async getOwnerCommercialStates(
    ownerIds: number[],
    now: Date = new Date()
  ): Promise<OwnerCommercialState[]> {
    return Promise.all(ownerIds.map((id) => this.getOwnerCommercialState(id, now)));
  }

  /**
   * AR-4 Category A / metrics — COMMERCIAL population only (ADMIN-AUTH-1C).
   * Sole boundary for certified commercial KPIs, reports, and analytics.
   */
  async getAllOwnerCommercialStates(
    now: Date = new Date()
  ): Promise<OwnerCommercialState[]> {
    const users = await getAllUsers({
      classificationFilter: COMMERCIAL_POPULATION_CLASSIFICATION,
    });
    return this.getOwnerCommercialStates(
      users.filter(isCommercialPopulationMember).map((u) => u.id),
      now
    );
  }
}

/** Default read service instance (EXEC-1 public entry). */
export const commercialReadService = new CommercialReadService();
