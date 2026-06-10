import { SECURITY_ACCOUNTS_HOSTED_ASSETS } from "../security/securityDomain";
import type { CustomerSuccessAssetDefinition } from "./customerSuccessTypes";

export const CUSTOMER_SUCCESS_DOMAIN_ID = "customer-success" as const;

/** REBUILD-5D — canonical Customer Success domain asset registry. */
export const CUSTOMER_SUCCESS_ASSET_DEFINITIONS: CustomerSuccessAssetDefinition[] = [
  {
    id: "accounts-workspace",
    category: "accounts",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessAccountsSection",
    queryKey: "admin.getOwnerOverviewList",
    surfaces: ["operations"],
  },
  {
    id: "tenants-workspace",
    category: "tenants",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessTenantsSection",
    queryKey: "admin.listRestaurants",
    surfaces: ["operations"],
  },
  {
    id: "communications-workspace",
    category: "communications",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessCommunicationsSection",
    queryKey: "admin.sendBulkNotification",
    surfaces: ["operations"],
  },
  {
    id: "subscription-health",
    category: "health",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessHealthSection",
    queryKey: "admin.getCommercialOverview",
    surfaces: ["commercial"],
  },
  {
    id: "needs-attention",
    category: "attention",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessAttentionSection",
    queryKey: "admin.getCommercialOverview",
    surfaces: ["commercial"],
  },
  {
    id: "subscription-lifecycle-actions",
    category: "lifecycle",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessAccountsSection",
    queryKey: "admin.createUserSubscriptionByAdmin",
    surfaces: ["operations"],
  },
  {
    id: "trial-lifecycle-display",
    category: "trial",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessAccountsSection",
    surfaces: ["operations"],
  },
  {
    id: "customer-health-indicators",
    category: "health",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessHealthSection",
    surfaces: ["commercial"],
  },
  {
    id: "api-get-owner-overview-list",
    category: "api",
    ownerPath: "server/commercial/adminDashboardRouter.ts",
    queryKey: "admin.getOwnerOverviewList",
    surfaces: ["operations"],
  },
  {
    id: "api-get-owner-overview",
    category: "api",
    ownerPath: "server/commercial/adminDashboardRouter.ts",
    queryKey: "admin.getOwnerOverview",
    surfaces: [],
  },
  {
    id: "api-get-subscription-overview",
    category: "api",
    ownerPath: "server/commercial/adminDashboardRouter.ts",
    queryKey: "admin.getSubscriptionOverview",
    surfaces: [],
  },
  {
    id: "api-list-restaurants",
    category: "api",
    ownerPath: "server/commercial/adminDashboardRouter.ts",
    queryKey: "admin.listRestaurants",
    surfaces: ["operations"],
  },
  {
    id: "api-create-subscriber-account",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.createSubscriberAccount",
    surfaces: ["operations"],
  },
  {
    id: "api-create-user-subscription",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.createUserSubscriptionByAdmin",
    surfaces: ["operations"],
  },
  {
    id: "api-update-user-subscription",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.updateUserSubscriptionByAdmin",
    surfaces: ["operations"],
  },
  {
    id: "api-delete-user-subscription",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.deleteUserSubscriptionByAdmin",
    surfaces: ["operations"],
  },
  {
    id: "api-send-custom-notification",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.sendCustomNotification",
    surfaces: ["operations"],
  },
  {
    id: "api-send-bulk-notification",
    category: "api",
    ownerPath: "server/routers.ts",
    queryKey: "admin.sendBulkNotification",
    surfaces: ["operations"],
  },
  {
    id: "helper-owner-commercial-display",
    category: "helper",
    ownerPath: "lib/admin/ownerCommercialDisplay.ts",
    surfaces: ["operations"],
  },
  {
    id: "helper-commercial-read-service",
    category: "helper",
    ownerPath: "server/commercial/CommercialReadService.ts",
    surfaces: ["operations", "commercial"],
  },
];

/** Security domain assets physically hosted in CS accounts workspace — not CS-owned. */
export const SECURITY_HOSTED_IN_ACCOUNTS = SECURITY_ACCOUNTS_HOSTED_ASSETS;

export const CUSTOMER_SUCCESS_COMPOSITION_SECTIONS = [
  "CustomerSuccessAccountsSection",
  "CustomerSuccessTenantsSection",
  "CustomerSuccessCommunicationsSection",
  "CustomerSuccessHealthSection",
  "CustomerSuccessAttentionSection",
  "CustomerSuccessCommercialSections",
] as const;
