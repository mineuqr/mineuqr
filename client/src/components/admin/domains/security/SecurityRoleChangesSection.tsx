import { useMemo } from "react";
import { UserCog } from "lucide-react";
import { AdminPageSection } from "@/components/admin/sections/AdminPageSection";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { AuditEventListFooter } from "./AuditEventListFooter";
import {
  extractRoleChangeDisplay,
  formatAuditActorLabel,
  formatAuditTargetLabel,
  formatAuditTimestamp,
} from "./auditEventDisplay";
import { ROLE_CHANGE_EVENT_TYPE } from "./auditEventConstants";
import { SecuritySectionError, SecuritySectionLoading } from "./SecuritySectionStates";
import { useSecurityCenterQueries } from "./useSecurityCenterQueries";
import { useAuditEventList } from "./useAuditEventList";

export function SecurityRoleChangesSection() {
  const { t } = useLanguage();
  const { adminEnabled } = useSecurityCenterQueries();

  const filter = useMemo(
    () => ({ eventType: ROLE_CHANGE_EVENT_TYPE }),
    []
  );

  const { items, isLoading, isError, isLoadingMore, hasMore, loadMore } =
    useAuditEventList({
      enabled: adminEnabled,
      filter,
    });

  return (
    <AdminPageSection
      title={t("admin.security.roleChanges.title")}
      description={t("admin.security.roleChanges.desc")}
      spacing="tight"
      titleVariant="compact"
    >
      {isLoading ? (
        <SecuritySectionLoading />
      ) : isError ? (
        <SecuritySectionError />
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={UserCog}
          title={t("admin.security.roleChanges.emptyTitle")}
          description={t("admin.security.roleChanges.emptyDesc")}
        />
      ) : (
        <div className={adminDash.operationsCard}>
          <div className={adminDash.opsTableWrap}>
            <table className={adminDash.opsTable}>
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th scope="col" className={adminDash.opsTableHead}>
                    {t("admin.security.timeline.colActor")}
                  </th>
                  <th scope="col" className={adminDash.opsTableHead}>
                    {t("admin.security.roleChanges.colTarget")}
                  </th>
                  <th scope="col" className={adminDash.opsTableHead}>
                    {t("admin.security.roleChanges.colPreviousRole")}
                  </th>
                  <th scope="col" className={adminDash.opsTableHead}>
                    {t("admin.security.roleChanges.colNewRole")}
                  </th>
                  <th scope="col" className={adminDash.opsTableHead}>
                    {t("admin.security.timeline.colTimestamp")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((event) => {
                  const row = extractRoleChangeDisplay(event);
                  return (
                    <tr key={event.id} className="border-b border-cyan-500/10">
                      <td dir="ltr" className={cn(adminDash.opsTableCell, "text-slate-300")}>
                        {formatAuditActorLabel(row.actorId)}
                      </td>
                      <td dir="ltr" className={cn(adminDash.opsTableCell, "text-white")}>
                        {formatAuditTargetLabel("user", row.targetUserId)}
                      </td>
                      <td dir="ltr" className={cn(adminDash.opsTableCell, "text-slate-300")}>
                        {row.previousRole ?? "—"}
                      </td>
                      <td dir="ltr" className={cn(adminDash.opsTableCell, "text-slate-300")}>
                        {row.newRole ?? "—"}
                      </td>
                      <td dir="ltr" className={cn(adminDash.opsTableCell, "text-slate-400")}>
                        {formatAuditTimestamp(event.occurredAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-cyan-500/15 lg:hidden">
            {items.map((event) => {
              const row = extractRoleChangeDisplay(event);
              return (
                <li key={event.id} className="px-3 py-2">
                  <p className="text-xs text-white">
                    {formatAuditTargetLabel("user", row.targetUserId)}
                  </p>
                  <p dir="ltr" className="mt-0.5 text-[11px] text-slate-400">
                    {row.previousRole ?? "—"} → {row.newRole ?? "—"} ·{" "}
                    {formatAuditTimestamp(event.occurredAt)}
                  </p>
                </li>
              );
            })}
          </ul>

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
