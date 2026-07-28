/**
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1
 * Audit event detail — read-oriented Sheet (legacy name: Drawer).
 */
import {
  SemanticDetailError,
  SemanticDetailFact,
  SemanticDetailGroup,
  SemanticDetailLoading,
  SemanticDetailSheet,
} from "@/design-system/semantic-detail-sheet";
import {
  SemanticBadge,
  mapAuditSeverityToBadgeTone,
} from "@/design-system/semantic-badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { AuditEventJsonField } from "./AuditEventJsonField";
import {
  formatAuditActorLabel,
  formatAuditTargetLabel,
  formatAuditTimestamp,
} from "./auditEventDisplay";
import { useAuthGate } from "@/_core/hooks/useAuthGate";

type AuditEventDetailSheetProps = {
  eventId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuditEventDetailSheet({
  eventId,
  open,
  onOpenChange,
}: AuditEventDetailSheetProps) {
  const { t } = useLanguage();
  const gate = useAuthGate();
  const adminEnabled = adminQueriesEnabled(
    gate.authPending,
    gate.isAuthenticated,
    gate.user?.role === "admin"
  );

  const detailQuery = trpc.admin.getAuditEvent.useQuery(
    { id: eventId! },
    { enabled: adminEnabled && open && eventId != null }
  );

  const event = detailQuery.data;

  return (
    <SemanticDetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={t("admin.security.timeline.detailTitle")}
      subtitle={
        event ? event.eventType : t("admin.security.timeline.detailLoading")
      }
      className="border-slate-700 bg-slate-800"
      headerClassName="border-cyan-500/20"
    >
      {detailQuery.isLoading ? <SemanticDetailLoading /> : null}

      {!detailQuery.isLoading && (detailQuery.isError || !event) ? (
        <SemanticDetailError message={t("admin.security.loadError")} />
      ) : null}

      {!detailQuery.isLoading && event ? (
        <div className="space-y-2">
          <SemanticDetailGroup columns={2}>
            <SemanticDetailFact
              label={t("admin.security.timeline.colEventType")}
              value={event.eventType}
              dir="ltr"
            />
            <SemanticDetailFact
              label={t("admin.security.timeline.colCategory")}
              value={event.category}
              dir="ltr"
            />
            <SemanticDetailFact
              label={t("admin.security.timeline.colSeverity")}
              value={event.severity}
              badge={
                <SemanticBadge
                  tone={mapAuditSeverityToBadgeTone(event.severity)}
                  density="outline"
                  size="sm"
                >
                  {event.severity}
                </SemanticBadge>
              }
            />
            <SemanticDetailFact
              label={t("admin.security.timeline.colTimestamp")}
              value={formatAuditTimestamp(event.occurredAt)}
              dir="ltr"
            />
          </SemanticDetailGroup>

          <SemanticDetailGroup>
            <SemanticDetailFact
              label={t("admin.security.timeline.colActor")}
              value={formatAuditActorLabel(event.actorId)}
              dir="ltr"
            />
            <SemanticDetailFact
              label={t("admin.security.timeline.detailTarget")}
              value={formatAuditTargetLabel(event.targetType, event.targetId)}
              dir="ltr"
            />
            <SemanticDetailFact
              label={t("admin.security.timeline.detailProcedure")}
              value={event.procedure ?? "—"}
              dir="ltr"
            />
            <SemanticDetailFact
              label={t("admin.security.timeline.detailCorrelationId")}
              value={event.correlationId ?? "—"}
              dir="ltr"
            />
          </SemanticDetailGroup>

          <AuditEventJsonField
            label={t("admin.security.timeline.detailMetadata")}
            value={event.metadata}
          />
          <AuditEventJsonField
            label={t("admin.security.timeline.detailBefore")}
            value={event.before}
          />
          <AuditEventJsonField
            label={t("admin.security.timeline.detailAfter")}
            value={event.after}
          />
        </div>
      ) : null}
    </SemanticDetailSheet>
  );
}

/** @deprecated Prefer AuditEventDetailSheet — Drawer was a Sheet. */
export const AuditEventDetailDrawer = AuditEventDetailSheet;
