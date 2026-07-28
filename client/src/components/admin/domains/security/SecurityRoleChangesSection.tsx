import { useMemo } from "react";
import { UserCog } from "lucide-react";
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
          <SemanticTableDesktop>
            <SemanticTableRoot density="ops">
              <SemanticTableHeader density="ops">
                <SemanticTableRow density="ops" className="border-b border-cyan-500/20">
                  <SemanticTableHead density="ops">
                    {t("admin.security.timeline.colActor")}
                  </SemanticTableHead>
                  <SemanticTableHead density="ops">
                    {t("admin.security.roleChanges.colTarget")}
                  </SemanticTableHead>
                  <SemanticTableHead density="ops">
                    {t("admin.security.roleChanges.colPreviousRole")}
                  </SemanticTableHead>
                  <SemanticTableHead density="ops">
                    {t("admin.security.roleChanges.colNewRole")}
                  </SemanticTableHead>
                  <SemanticTableHead density="ops">
                    {t("admin.security.timeline.colTimestamp")}
                  </SemanticTableHead>
                </SemanticTableRow>
              </SemanticTableHeader>
              <SemanticTableBody>
                {items.map((event) => {
                  const row = extractRoleChangeDisplay(event);
                  return (
                    <SemanticTableRow key={event.id} density="ops">
                      <SemanticTableCell dir="ltr" density="ops" className="text-slate-300">
                        {formatAuditActorLabel(row.actorId)}
                      </SemanticTableCell>
                      <SemanticTableCell dir="ltr" density="ops" className="text-white">
                        {formatAuditTargetLabel("user", row.targetUserId)}
                      </SemanticTableCell>
                      <SemanticTableCell dir="ltr" density="ops" className="text-slate-300">
                        {row.previousRole ?? "—"}
                      </SemanticTableCell>
                      <SemanticTableCell dir="ltr" density="ops" className="text-slate-300">
                        {row.newRole ?? "—"}
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
