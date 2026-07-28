import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { AdminPageSection } from "@/components/admin/sections/AdminPageSection";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import {
  SemanticBadge,
  mapAuditSeverityToBadgeTone,
} from "@/design-system/semantic-badge";
import {
  SemanticTableBody,
  SemanticTableCell,
  SemanticTableDesktop,
  SemanticTableHead,
  SemanticTableHeader,
  SemanticTableMobile,
  SemanticTableRoot,
  SemanticTableRow,
} from "@/design-system/semantic-table";
import { useLanguage } from "@/contexts/LanguageContext";
import { AuditEventDetailDrawer } from "./AuditEventDetailDrawer";
import { AuditEventListFooter } from "./AuditEventListFooter";
import {
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
            <SemanticTableDesktop>
              <SemanticTableRoot density="ops">
                <SemanticTableHeader density="ops">
                  <SemanticTableRow density="ops" className="border-b border-cyan-500/20">
                    <SemanticTableHead density="ops">
                      {t("admin.security.timeline.colEventType")}
                    </SemanticTableHead>
                    <SemanticTableHead density="ops">
                      {t("admin.security.timeline.colCategory")}
                    </SemanticTableHead>
                    <SemanticTableHead density="ops">
                      {t("admin.security.timeline.colSeverity")}
                    </SemanticTableHead>
                    <SemanticTableHead density="ops">
                      {t("admin.security.timeline.colActor")}
                    </SemanticTableHead>
                    <SemanticTableHead density="ops">
                      {t("admin.security.timeline.colTimestamp")}
                    </SemanticTableHead>
                  </SemanticTableRow>
                </SemanticTableHeader>
                <SemanticTableBody>
                  {items.map((event) => (
                    <SemanticTableRow
                      key={event.id}
                      density="ops"
                      className="cursor-pointer"
                      onClick={() => openDetail(event.id)}
                    >
                      <SemanticTableCell
                        dir="ltr"
                        density="ops"
                        truncate
                        className="text-white"
                      >
                        {event.eventType}
                      </SemanticTableCell>
                      <SemanticTableCell dir="ltr" density="ops" className="text-slate-300">
                        {event.category}
                      </SemanticTableCell>
                      <SemanticTableCell density="ops">
                        <SemanticBadge
                          tone={mapAuditSeverityToBadgeTone(event.severity)}
                          density="outline"
                          size="sm"
                        >
                          {event.severity}
                        </SemanticBadge>
                      </SemanticTableCell>
                      <SemanticTableCell dir="ltr" density="ops" className="text-slate-300">
                        {formatAuditActorLabel(event.actorId)}
                      </SemanticTableCell>
                      <SemanticTableCell dir="ltr" density="ops" className="text-slate-400">
                        {formatAuditTimestamp(event.occurredAt)}
                      </SemanticTableCell>
                    </SemanticTableRow>
                  ))}
                </SemanticTableBody>
              </SemanticTableRoot>
            </SemanticTableDesktop>

            <SemanticTableMobile>
            <ul className="divide-y divide-cyan-500/15">
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
            </SemanticTableMobile>

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
