import { useMemo } from "react";
import { CreditCard } from "lucide-react";
import { AdminPageSection } from "@/components/admin/sections/AdminPageSection";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
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
import { AuditEventListFooter } from "./AuditEventListFooter";
import {
  formatAuditActorLabel,
  formatAuditTargetLabel,
  formatAuditTimestamp,
  formatSubscriptionChangeSummary,
} from "./auditEventDisplay";
import { SecuritySectionError, SecuritySectionLoading } from "./SecuritySectionStates";
import { useSecurityCenterQueries } from "./useSecurityCenterQueries";
import { useAuditEventList } from "./useAuditEventList";

export function SecuritySubscriptionChangesSection() {
  const { t } = useLanguage();
  const { adminEnabled } = useSecurityCenterQueries();

  const filter = useMemo(() => ({ category: "SUBSCRIPTION" as const }), []);

  const { items, isLoading, isError, isLoadingMore, hasMore, loadMore } =
    useAuditEventList({
      enabled: adminEnabled,
      filter,
    });

  return (
    <AdminPageSection
      title={t("admin.security.subscriptionChanges.title")}
      description={t("admin.security.subscriptionChanges.desc")}
      spacing="tight"
      titleVariant="compact"
    >
      {isLoading ? (
        <SecuritySectionLoading />
      ) : isError ? (
        <SecuritySectionError />
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={CreditCard}
          title={t("admin.security.subscriptionChanges.emptyTitle")}
          description={t("admin.security.subscriptionChanges.emptyDesc")}
        />
      ) : (
        <div className={adminDash.operationsCard}>
          <SemanticTableDesktop>
            <SemanticTableRoot density="ops">
              <SemanticTableHeader density="ops">
                <SemanticTableRow density="ops" className="border-b border-cyan-500/20">
                  <SemanticTableHead density="ops">
                    {t("admin.security.timeline.colActor")}
                  </SemanticTableHead>
                  <SemanticTableHead density="ops">
                    {t("admin.security.subscriptionChanges.colTarget")}
                  </SemanticTableHead>
                  <SemanticTableHead density="ops">
                    {t("admin.security.subscriptionChanges.colAction")}
                  </SemanticTableHead>
                  <SemanticTableHead density="ops">
                    {t("admin.security.subscriptionChanges.colSummary")}
                  </SemanticTableHead>
                  <SemanticTableHead density="ops">
                    {t("admin.security.timeline.colTimestamp")}
                  </SemanticTableHead>
                </SemanticTableRow>
              </SemanticTableHeader>
              <SemanticTableBody>
                {items.map((event) => {
                  const summary = formatSubscriptionChangeSummary(event);
                  return (
                    <SemanticTableRow key={event.id} density="ops">
                      <SemanticTableCell dir="ltr" density="ops" className="text-slate-300">
                        {formatAuditActorLabel(event.actorId)}
                      </SemanticTableCell>
                      <SemanticTableCell dir="ltr" density="ops" className="text-white">
                        {formatAuditTargetLabel(event.targetType, event.targetId)}
                      </SemanticTableCell>
                      <SemanticTableCell
                        dir="ltr"
                        density="ops"
                        truncate
                        className="text-slate-300"
                      >
                        {event.eventType}
                      </SemanticTableCell>
                      <SemanticTableCell
                        dir="ltr"
                        density="ops"
                        truncate
                        className="text-slate-400"
                        title={`${summary.beforeSummary} → ${summary.afterSummary}`}
                      >
                        {summary.beforeSummary} → {summary.afterSummary}
                      </SemanticTableCell>
                      <SemanticTableCell dir="ltr" density="ops" className="text-slate-400">
                        {formatAuditTimestamp(event.occurredAt)}
                      </SemanticTableCell>
                    </SemanticTableRow>
                  );
                })}
              </SemanticTableBody>
            </SemanticTableRoot>
          </SemanticTableDesktop>

          <SemanticTableMobile>
          <ul className="divide-y divide-cyan-500/15">
            {items.map((event) => {
              const summary = formatSubscriptionChangeSummary(event);
              return (
                <li key={event.id} className="px-3 py-2">
                  <p dir="ltr" className="truncate text-xs text-white">
                    {event.eventType}
                  </p>
                  <p dir="ltr" className="mt-0.5 text-[11px] text-slate-400">
                    {summary.beforeSummary} → {summary.afterSummary} ·{" "}
                    {formatAuditTimestamp(event.occurredAt)}
                  </p>
                </li>
              );
            })}
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
  );
}
