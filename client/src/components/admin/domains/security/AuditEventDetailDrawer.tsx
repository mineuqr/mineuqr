import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SemanticBadge,
  mapAuditSeverityToBadgeTone,
} from "@/design-system/semantic-badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { AuditEventJsonField } from "./AuditEventJsonField";
import {
  formatAuditActorLabel,
  formatAuditTargetLabel,
  formatAuditTimestamp,
} from "./auditEventDisplay";
import { useAuthGate } from "@/_core/hooks/useAuthGate";

type AuditEventDetailDrawerProps = {
  eventId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailFact({
  label,
  value,
  dir = "auto",
}: {
  label: string;
  value: ReactNode;
  dir?: "ltr" | "rtl" | "auto";
}) {
  return (
    <div className="rounded-md border border-cyan-500/15 bg-slate-900/30 px-2.5 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd dir={dir} className="mt-0.5 text-xs font-medium text-white">
        {value}
      </dd>
    </div>
  );
}

export function AuditEventDetailDrawer({
  eventId,
  open,
  onOpenChange,
}: AuditEventDetailDrawerProps) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(adminDash.dialogContent, "w-full sm:max-w-md")}
      >
        <SheetHeader className="border-b border-cyan-500/20 pb-3">
          <SheetTitle className="text-sm text-white">
            {t("admin.security.timeline.detailTitle")}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {event ? event.eventType : t("admin.security.timeline.detailLoading")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-2 overflow-y-auto px-1 py-3">
          {detailQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            </div>
          ) : detailQuery.isError || !event ? (
            <p className="text-xs text-red-300">{t("admin.security.loadError")}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <DetailFact
                  label={t("admin.security.timeline.colEventType")}
                  value={event.eventType}
                  dir="ltr"
                />
                <DetailFact
                  label={t("admin.security.timeline.colCategory")}
                  value={event.category}
                  dir="ltr"
                />
                <div className="rounded-md border border-cyan-500/15 bg-slate-900/30 px-2.5 py-1.5">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">
                    {t("admin.security.timeline.colSeverity")}
                  </dt>
                  <dd className="mt-0.5">
                    <SemanticBadge
                      tone={mapAuditSeverityToBadgeTone(event.severity)}
                      density="outline"
                      size="sm"
                    >
                      {event.severity}
                    </SemanticBadge>
                  </dd>
                </div>
                <DetailFact
                  label={t("admin.security.timeline.colTimestamp")}
                  value={formatAuditTimestamp(event.occurredAt)}
                  dir="ltr"
                />
              </div>

              <div className="grid gap-1.5">
                <DetailFact
                  label={t("admin.security.timeline.colActor")}
                  value={formatAuditActorLabel(event.actorId)}
                  dir="ltr"
                />
                <DetailFact
                  label={t("admin.security.timeline.detailTarget")}
                  value={formatAuditTargetLabel(event.targetType, event.targetId)}
                  dir="ltr"
                />
                <DetailFact
                  label={t("admin.security.timeline.detailProcedure")}
                  value={event.procedure ?? "—"}
                  dir="ltr"
                />
                <DetailFact
                  label={t("admin.security.timeline.detailCorrelationId")}
                  value={event.correlationId ?? "—"}
                  dir="ltr"
                />
              </div>

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
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
