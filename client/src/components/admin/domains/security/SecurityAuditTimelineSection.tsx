import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { AdminPageSection } from "@/components/admin/sections/AdminPageSection";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { AuditEventDetailDrawer } from "./AuditEventDetailDrawer";
import { AuditEventListFooter } from "./AuditEventListFooter";
import {
  auditSeverityClass,
  formatAuditActorLabel,
  formatAuditTimestamp,
} from "./auditEventDisplay";
import { SecuritySectionError, SecuritySectionLoading } from "./SecuritySectionStates";
import { useSecurityCenterQueries } from "./useSecurityCenterQueries";
import { useAuditEventList } from "./useAuditEventList";

export function SecurityAuditTimelineSection() {
  const { t } = useLanguage();
  const { adminEnabled } = useSecurityCenterQueries();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filter = useMemo(() => ({}), []);

  const { items, isLoading, isError, isLoadingMore, hasMore, loadMore } =
    useAuditEventList({ enabled: adminEnabled, filter });

  const openDetail = (id: number) => {
    setSelectedEventId(id);
    setDrawerOpen(true);
  };

  return (
    <>
      <AdminPageSection
        title={t("admin.security.timeline.title")}
        description={t("admin.security.timeline.desc")}
        spacing="tight"
        titleVariant="compact"
      >
        {isLoading ? (
          <SecuritySectionLoading />
        ) : isError ? (
          <SecuritySectionError />
        ) : items.length === 0 ? (
          <AdminEmptyState
            icon={History}
            title={t("admin.security.timeline.emptyTitle")}
            description={t("admin.security.timeline.emptyDesc")}
          />
        ) : (
          <div className={adminDash.operationsCard}>
            <div className={adminDash.opsTableWrap}>
              <table className={adminDash.opsTable}>
                <thead>
                  <tr className="border-b border-cyan-500/20">
                    <th scope="col" className={adminDash.opsTableHead}>
                      {t("admin.security.timeline.colEventType")}
                    </th>
                    <th scope="col" className={adminDash.opsTableHead}>
                      {t("admin.security.timeline.colCategory")}
                    </th>
                    <th scope="col" className={adminDash.opsTableHead}>
                      {t("admin.security.timeline.colSeverity")}
                    </th>
                    <th scope="col" className={adminDash.opsTableHead}>
                      {t("admin.security.timeline.colActor")}
                    </th>
                    <th scope="col" className={adminDash.opsTableHead}>
                      {t("admin.security.timeline.colTimestamp")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((event) => (
                    <tr
                      key={event.id}
                      className="cursor-pointer border-b border-cyan-500/10 hover:bg-slate-800/30"
                      onClick={() => openDetail(event.id)}
                    >
                      <td
                        dir="ltr"
                        className={cn(adminDash.opsTableCell, adminDash.opsTableTruncate, "text-white")}
                      >
                        {event.eventType}
                      </td>
                      <td dir="ltr" className={cn(adminDash.opsTableCell, "text-slate-300")}>
                        {event.category}
                      </td>
                      <td className={adminDash.opsTableCell}>
                        <span
                          className={cn(
                            "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium",
                            auditSeverityClass(event.severity)
                          )}
                        >
                          {event.severity}
                        </span>
                      </td>
                      <td dir="ltr" className={cn(adminDash.opsTableCell, "text-slate-300")}>
                        {formatAuditActorLabel(event.actorId)}
                      </td>
                      <td dir="ltr" className={cn(adminDash.opsTableCell, "text-slate-400")}>
                        {formatAuditTimestamp(event.occurredAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-cyan-500/15 lg:hidden">
              {items.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-start hover:bg-slate-800/30"
                    onClick={() => openDetail(event.id)}
                  >
                    <p dir="ltr" className="truncate text-xs font-medium text-white">
                      {event.eventType}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-400">
                      <span dir="ltr">{event.category}</span>
                      <span dir="ltr">{formatAuditActorLabel(event.actorId)}</span>
                      <span dir="ltr">{formatAuditTimestamp(event.occurredAt)}</span>
                    </p>
                  </button>
                </li>
              ))}
            </ul>

            <AuditEventListFooter
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMore}
            />
          </div>
        )}
      </AdminPageSection>

      <AuditEventDetailDrawer
        eventId={selectedEventId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
