import { getAllUsers, getSubscriptionsByUser } from "../db";
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
 * COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1:
 * Entitlements via getCommercialEntitlements (branch Snapshot | Legacy).
 * Bound path uses Live Plan commercialName.
 * Unbound display name resolves from Live Plan / identity bridge — never the legacy plan table.
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

    const meta = (result as { meta?: { commercialName?: string; commercialResolutionSource?: string } })
      .meta;
    const snapshotName =
      meta?.commercialResolutionSource === "snapshot" ||
      meta?.commercialResolutionSource === "snapshot_fail_closed" ||
      meta?.commercialResolutionSource === "live_plan"
        ? meta.commercialName ?? null
        : null;

    const { resolveLivePlanDisplayByLegacyId } = await import(
      "../services/commercial-catalog"
    );
    const catalogPlan =
      snapshotName == null && canonicalRow != null
        ? await resolveLivePlanDisplayByLegacyId(canonicalRow.planId)
        : null;

    const authority = mapToCommercialAuthority(
      result,
      canonicalRow,
      catalogPlan,
      now
    );
    if (snapshotName) {
      return { ...authority, planName: snapshotName };
    }
    return authority;
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
