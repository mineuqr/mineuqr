/** REBUILD-5D — operations re-exports Customer Success domain sections. */
export {
  CustomerSuccessAccountsSection as AccountsTab,
  CustomerSuccessTenantsSection as TenantsTab,
  CustomerSuccessCommunicationsSection as CommunicationsTab,
} from "@/components/admin/domains/customer-success";
export {
  DEFAULT_OPERATIONS_TAB,
  OPERATIONS_TABS,
  operationsTabHref,
  parseOperationsTab,
  type OperationsTab,
} from "./operationsTab";
