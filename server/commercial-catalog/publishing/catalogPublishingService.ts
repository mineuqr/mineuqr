/**
 * COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1
 * Canonical Catalog publishing authority — wraps PublicationService + workflow overlay.
 * COMMERCIAL-PUBLICATION-PERSISTENCE-ARCHITECTURE-1 — publish is durable (not memory-only).
 * NEVER participates in entitlement decisions. NEVER mutates Subscription Snapshots.
 */

import {
  resolvePublicationWorkflowState,
  visibilityForWorkflowState,
  type PublicationWorkflowState,
  type PublicCatalogVisibility,
  COMMERCIAL_CATALOG_PUBLIC_PUBLISHING_PROGRAM,
} from "@shared/commercial-catalog";
import type { CommercialPlanVersion } from "@shared/commercial-catalog";
import {
  CommercialCatalogError,
  publicationService,
  planVersionService,
  commercialCatalogStore,
  persistPublishedVersionPublication,
  persistVersionLifecyclePublication,
  invalidateCatalogReadyGate,
} from "../../services/commercial-catalog";
import type { CommercialCatalogAuditActor } from "../../services/commercial-catalog/commercialCatalogAudit";
import {
  clearPublicationOverlay,
  getPublicationOverlay,
  setPublicationOverlay,
} from "./publicationOverlay";
import { invalidatePublicCatalogCache } from "./publicCatalogCache";

export type VersionPublicationStatus = {
  program: typeof COMMERCIAL_CATALOG_PUBLIC_PUBLISHING_PROGRAM;
  planVersionId: string;
  foundationState: CommercialPlanVersion["state"];
  workflowState: PublicationWorkflowState;
  visibility: PublicCatalogVisibility;
  approved: boolean;
  scheduledEffectiveAt: string | null;
  archived: boolean;
  publishedAt: string | null;
  deprecatedAt: string | null;
  retiredAt: string | null;
};

function statusForVersion(version: CommercialPlanVersion): VersionPublicationStatus {
  const overlay = getPublicationOverlay(version.id);
  const workflowState = resolvePublicationWorkflowState({
    foundationState: version.state,
    approved: overlay?.approved === true,
    scheduledEffectiveAt: overlay?.scheduledEffectiveAt ?? null,
    archived: overlay?.archived === true,
  });
  return {
    program: COMMERCIAL_CATALOG_PUBLIC_PUBLISHING_PROGRAM,
    planVersionId: version.id,
    foundationState: version.state,
    workflowState,
    visibility: visibilityForWorkflowState(workflowState),
    approved: overlay?.approved === true,
    scheduledEffectiveAt: overlay?.scheduledEffectiveAt ?? null,
    archived: overlay?.archived === true,
    publishedAt: version.publishedAt ?? null,
    deprecatedAt: version.deprecatedAt ?? null,
    retiredAt: version.retiredAt ?? null,
  };
}

export class CatalogPublishingService {
  /** Approve a Draft version for later schedule/publish (governance overlay). */
  approveVersion(
    versionId: string,
    _actor: CommercialCatalogAuditActor = {}
  ): VersionPublicationStatus {
    const version = planVersionService.get(versionId);
    if (!version) {
      throw new CommercialCatalogError("Version not found", "not_found");
    }
    if (version.state !== "draft") {
      throw new CommercialCatalogError(
        `Cannot approve version in foundation state ${version.state}`,
        "invalid_transition"
      );
    }
    const overlay = getPublicationOverlay(versionId);
    if (overlay?.archived) {
      throw new CommercialCatalogError(
        "Cannot approve an archived version",
        "invalid_transition"
      );
    }
    setPublicationOverlay(versionId, {
      approved: true,
      scheduledEffectiveAt: overlay?.scheduledEffectiveAt ?? null,
      archived: false,
    });
    invalidatePublicCatalogCache();
    return statusForVersion(planVersionService.get(versionId)!);
  }

  /**
   * Schedule publish — requires Approved governance state.
   * Foundation remains draft until publish executes.
   */
  schedulePublish(
    versionId: string,
    effectiveAt: string,
    _actor: CommercialCatalogAuditActor = {}
  ): VersionPublicationStatus {
    const version = planVersionService.get(versionId);
    if (!version) {
      throw new CommercialCatalogError("Version not found", "not_found");
    }
    if (version.state !== "draft") {
      throw new CommercialCatalogError(
        `Cannot schedule version in foundation state ${version.state}`,
        "invalid_transition"
      );
    }
    const overlay = getPublicationOverlay(versionId);
    if (!overlay?.approved) {
      throw new CommercialCatalogError(
        "Schedule requires Approved workflow state",
        "invalid_transition"
      );
    }
    const at = new Date(effectiveAt);
    if (Number.isNaN(at.getTime())) {
      throw new CommercialCatalogError(
        "scheduledEffectiveAt must be a valid ISO datetime",
        "invalid_input"
      );
    }
    if (at.getTime() <= Date.now()) {
      throw new CommercialCatalogError(
        "scheduledEffectiveAt must be in the future",
        "invalid_input"
      );
    }
    setPublicationOverlay(versionId, {
      approved: true,
      scheduledEffectiveAt: at.toISOString(),
      archived: false,
    });
    invalidatePublicCatalogCache();
    return statusForVersion(planVersionService.get(versionId)!);
  }

  cancelSchedule(
    versionId: string,
    _actor: CommercialCatalogAuditActor = {}
  ): VersionPublicationStatus {
    const version = planVersionService.get(versionId);
    if (!version) {
      throw new CommercialCatalogError("Version not found", "not_found");
    }
    const overlay = getPublicationOverlay(versionId);
    if (!overlay?.scheduledEffectiveAt) {
      throw new CommercialCatalogError(
        "Version is not scheduled",
        "invalid_transition"
      );
    }
    setPublicationOverlay(versionId, {
      approved: overlay.approved === true,
      scheduledEffectiveAt: null,
      archived: false,
    });
    invalidatePublicCatalogCache();
    return statusForVersion(planVersionService.get(versionId)!);
  }

  /**
   * Publish — durable authority.
   * Memory update is provisional; success only after persistent publication.
   * On persistence failure, memory is rolled back to pre-publish state.
   * Does not touch Subscription Runtime / Snapshots.
   */
  async publish(
    versionId: string,
    actor: CommercialCatalogAuditActor = {},
    options?: {
      requiresRegionalPricing?: boolean;
      /** When true, require Approved or Scheduled before publish. */
      enforceWorkflow?: boolean;
    }
  ): Promise<{
    version: CommercialPlanVersion;
    status: VersionPublicationStatus;
  }> {
    const version = planVersionService.get(versionId);
    if (!version) {
      throw new CommercialCatalogError("Version not found", "not_found");
    }
    if (options?.enforceWorkflow) {
      const status = statusForVersion(version);
      if (
        status.workflowState !== "approved" &&
        status.workflowState !== "scheduled"
      ) {
        throw new CommercialCatalogError(
          `Workflow publish requires Approved or Scheduled (got ${status.workflowState})`,
          "invalid_transition"
        );
      }
    }

    const before = { ...version };
    const overlayBefore = getPublicationOverlay(versionId);

    const published = publicationService.publish(versionId, actor, {
      requiresRegionalPricing: options?.requiresRegionalPricing,
    });

    try {
      await persistPublishedVersionPublication(versionId);
    } catch (e) {
      commercialCatalogStore.versions.set(versionId, before);
      if (overlayBefore) {
        setPublicationOverlay(versionId, overlayBefore);
      }
      const msg = e instanceof Error ? e.message : "publication_persistence_failed";
      commercialCatalogStore.recordPublicationError(msg);
      throw new CommercialCatalogError(
        `Persistent publication failed: ${msg}`,
        "publication_persistence_failed"
      );
    }

    clearPublicationOverlay(versionId);
    // Cache invalidation only after durable success; ready gate rehydrates from authority.
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    return {
      version: planVersionService.get(versionId) ?? published,
      status: statusForVersion(planVersionService.get(versionId) ?? published),
    };
  }

  /**
   * Apply due schedules: Scheduled versions whose effectiveAt ≤ now → publish.
   * Catalog-owned only; no entitlement side effects.
   */
  async applyDueSchedules(
    actor: CommercialCatalogAuditActor = {}
  ): Promise<
    Array<{ planVersionId: string; published: boolean; reason?: string }>
  > {
    const results: Array<{
      planVersionId: string;
      published: boolean;
      reason?: string;
    }> = [];
    const now = new Date();
    for (const version of planVersionService.list()) {
      if (version.state !== "draft") continue;
      const overlay = getPublicationOverlay(version.id);
      if (!overlay?.scheduledEffectiveAt || !overlay.approved) continue;
      const at = new Date(overlay.scheduledEffectiveAt);
      if (Number.isNaN(at.getTime()) || at > now) continue;
      try {
        await this.publish(version.id, actor, { enforceWorkflow: true });
        results.push({ planVersionId: version.id, published: true });
      } catch (e) {
        results.push({
          planVersionId: version.id,
          published: false,
          reason: e instanceof Error ? e.message : "publish_failed",
        });
      }
    }
    return results;
  }

  async deprecate(
    versionId: string,
    actor: CommercialCatalogAuditActor = {}
  ): Promise<{
    version: CommercialPlanVersion;
    status: VersionPublicationStatus;
  }> {
    const before = planVersionService.get(versionId);
    if (!before) {
      throw new CommercialCatalogError("Version not found", "not_found");
    }
    const prior = { ...before };
    const updated = publicationService.deprecate(versionId, actor);
    try {
      await persistVersionLifecyclePublication(versionId);
    } catch (e) {
      commercialCatalogStore.versions.set(versionId, prior);
      const msg = e instanceof Error ? e.message : "publication_persistence_failed";
      throw new CommercialCatalogError(
        `Persistent deprecate failed: ${msg}`,
        "publication_persistence_failed"
      );
    }
    clearPublicationOverlay(versionId);
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    return { version: updated, status: statusForVersion(updated) };
  }

  async retire(
    versionId: string,
    actor: CommercialCatalogAuditActor = {}
  ): Promise<{
    version: CommercialPlanVersion;
    status: VersionPublicationStatus;
  }> {
    const before = planVersionService.get(versionId);
    if (!before) {
      throw new CommercialCatalogError("Version not found", "not_found");
    }
    const prior = { ...before };
    const updated = publicationService.retire(versionId, actor);
    try {
      await persistVersionLifecyclePublication(versionId);
    } catch (e) {
      commercialCatalogStore.versions.set(versionId, prior);
      const msg = e instanceof Error ? e.message : "publication_persistence_failed";
      throw new CommercialCatalogError(
        `Persistent retire failed: ${msg}`,
        "publication_persistence_failed"
      );
    }
    const overlay = getPublicationOverlay(versionId);
    if (!overlay?.archived) {
      clearPublicationOverlay(versionId);
    }
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    return { version: updated, status: statusForVersion(updated) };
  }

  /**
   * Archive — Retired only. Publicly inaccessible thereafter.
   * Historical Subscription Snapshots remain untouched.
   */
  archiveVersion(
    versionId: string,
    _actor: CommercialCatalogAuditActor = {}
  ): VersionPublicationStatus {
    const version = planVersionService.get(versionId);
    if (!version) {
      throw new CommercialCatalogError("Version not found", "not_found");
    }
    if (version.state !== "retired") {
      throw new CommercialCatalogError(
        "Archive requires Retired foundation state",
        "invalid_transition"
      );
    }
    setPublicationOverlay(versionId, {
      approved: false,
      scheduledEffectiveAt: null,
      archived: true,
    });
    invalidatePublicCatalogCache();
    return statusForVersion(planVersionService.get(versionId)!);
  }

  getStatus(versionId: string): VersionPublicationStatus {
    const version = planVersionService.get(versionId);
    if (!version) {
      throw new CommercialCatalogError("Version not found", "not_found");
    }
    return statusForVersion(version);
  }

  listStatuses(): VersionPublicationStatus[] {
    return planVersionService.list().map(statusForVersion);
  }
}

export const catalogPublishingService = new CatalogPublishingService();
