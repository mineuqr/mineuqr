import { useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import {
  CustomerSuccessAccountsSection,
  CustomerSuccessCommunicationsSection,
  CustomerSuccessTenantsSection,
} from "@/components/admin/domains/customer-success";
import {
  AdminOperationsShell,
  adminDash,
} from "@/components/admin/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAdminPageShell } from "@/lib/admin/routes/adminRouteRegistry";
import {
  DEFAULT_OPERATIONS_TAB,
  type OperationsTab,
  parseOperationsTab,
} from "@/pages/admin/operations/operationsTab";

/** @deprecated Import from `@/components/admin/domains/customer-success` */
export { CustomerSuccessAccountsSection as AccountsTab } from "@/components/admin/domains/customer-success";

/** @deprecated Import from `@/components/admin/domains/customer-success` */
export { CustomerSuccessTenantsSection as TenantsTab } from "@/components/admin/domains/customer-success";

/** Operations workspace host — consumes Customer Success domain sections. */
export default function AdminManagement() {
  const gate = useAuthGate();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const activeTab = parseOperationsTab(search);

  const setTab = useCallback(
    (tab: OperationsTab) => {
      const raw = search.startsWith("?") ? search.slice(1) : search;
      const params = new URLSearchParams(raw);
      if (tab === DEFAULT_OPERATIONS_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const q = params.toString();
      setLocation(q ? `/admin/operations?${q}` : "/admin/operations");
    },
    [search, setLocation]
  );

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const shell = resolveAdminPageShell("operations", t);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setTab(v as OperationsTab)} className="contents">
      <AdminOperationsShell
        compact
        narrowContent
        title={shell.title}
        breadcrumbs={shell.breadcrumbs}
        headerFooter={
          <TabsList className={adminDash.opsTabList}>
            <TabsTrigger value="accounts" className="text-xs">
              {t("admin.operations.tabAccounts")}
            </TabsTrigger>
            <TabsTrigger value="tenants" className="text-xs">
              {t("admin.operations.tabTenants")}
            </TabsTrigger>
            <TabsTrigger value="communications" className="text-xs">
              {t("admin.operations.tabCommunications")}
            </TabsTrigger>
          </TabsList>
        }
      >
        <TabsContent value="accounts" className="mt-0">
          <CustomerSuccessAccountsSection />
        </TabsContent>
        <TabsContent value="tenants" className="mt-0">
          <CustomerSuccessTenantsSection />
        </TabsContent>
        <TabsContent value="communications" className="mt-0">
          <CustomerSuccessCommunicationsSection />
        </TabsContent>
      </AdminOperationsShell>
    </Tabs>
  );
}
