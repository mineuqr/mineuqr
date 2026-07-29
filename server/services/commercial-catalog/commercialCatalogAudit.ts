/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1 — audit emitters.
 */

import { emitAuditEvent } from "../../audit/auditEmitter";
import { OPS_EVENT } from "../../_core/opsTaxonomy";

export type CommercialCatalogAuditActor = {
  actorId?: number | null;
  actorRole?: string | null;
  correlationId?: string | null;
  procedure?: string;
};

function emit(
  eventType: string,
  actor: CommercialCatalogAuditActor,
  targetId: string | null,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  metadata?: Record<string, unknown>
) {
  emitAuditEvent({
    eventType,
    category: "COMMERCIAL",
    severity: "info",
    opsCategory: "ADMIN",
    actorId: actor.actorId ?? null,
    actorRole: actor.actorRole ?? null,
    correlationId: actor.correlationId ?? null,
    procedure: actor.procedure ?? null,
    targetType: "platform",
    targetId: null,
    before,
    after,
    metadata: {
      commercialTargetId: targetId,
      ...metadata,
    },
  });
}

export function auditCommercialCreated(
  actor: CommercialCatalogAuditActor,
  entity: string,
  id: string,
  after: Record<string, unknown>
) {
  emit(OPS_EVENT.commercial_catalog_created, actor, id, null, after, {
    entity,
  });
}

export function auditCommercialUpdated(
  actor: CommercialCatalogAuditActor,
  entity: string,
  id: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  emit(OPS_EVENT.commercial_catalog_updated, actor, id, before, after, {
    entity,
  });
}

export function auditCommercialPublished(
  actor: CommercialCatalogAuditActor,
  id: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  emit(OPS_EVENT.commercial_catalog_published, actor, id, before, after);
}

export function auditCommercialDeprecated(
  actor: CommercialCatalogAuditActor,
  id: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  emit(OPS_EVENT.commercial_catalog_deprecated, actor, id, before, after);
}

export function auditCommercialRetired(
  actor: CommercialCatalogAuditActor,
  id: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  emit(OPS_EVENT.commercial_catalog_retired, actor, id, before, after);
}

export function auditPromotionCreated(
  actor: CommercialCatalogAuditActor,
  id: string,
  after: Record<string, unknown>
) {
  emit(OPS_EVENT.commercial_promotion_created, actor, id, null, after);
}

export function auditMigrationPolicyChanged(
  actor: CommercialCatalogAuditActor,
  id: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown>
) {
  emit(
    OPS_EVENT.commercial_migration_policy_changed,
    actor,
    id,
    before,
    after
  );
}

export function auditRegionalPolicyChanged(
  actor: CommercialCatalogAuditActor,
  id: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown>
) {
  emit(OPS_EVENT.commercial_regional_policy_changed, actor, id, before, after);
}
