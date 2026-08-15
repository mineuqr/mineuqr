/** REBUILD-5D — Customer Success platform domain type contracts. */

export type CustomerSuccessDomainId = "customer-success";

export type CustomerSuccessAssetCategory =
  | "accounts"
  | "tenants"
  | "lifecycle"
  | "trial"
  | "subscription"
  | "health"
  | "attention"
  | "communications"
  | "api"
  | "helper";

export type CustomerSuccessAssetId =
  | "accounts-workspace"
  | "tenants-workspace"
  | "communications-workspace"
  | "subscription-health"
  | "needs-attention"
  | "subscription-lifecycle-actions"
  | "trial-lifecycle-display"
  | "customer-health-indicators"
  | "api-get-owner-overview-list"
  | "api-get-owner-overview"
  | "api-get-subscription-overview"
  | "api-list-restaurants"
  | "api-create-subscriber-account"
  | "api-create-user-subscription"
  | "api-update-user-subscription"
  | "api-reactivate-user-subscription"
  | "api-delete-user-subscription"
  | "api-send-custom-notification"
  | "api-send-bulk-notification"
  | "helper-owner-commercial-display"
  | "helper-commercial-read-service";

/** @deprecated Use SecurityAccountsHostedAssetId from security domain — CS is host only. */
export type { SecurityAccountsHostedAssetId as SecurityHostedAssetId } from "../security/securityTypes";

export type CustomerSuccessSurfaceId = "operations" | "commercial";

export type CustomerSuccessAssetDefinition = {
  id: CustomerSuccessAssetId;
  category: CustomerSuccessAssetCategory;
  ownerPath: string;
  queryKey?: string;
  surfaces: CustomerSuccessSurfaceId[];
};
