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
  | "api-delete-user-subscription"
  | "api-send-custom-notification"
  | "api-send-bulk-notification"
  | "helper-owner-commercial-display"
  | "helper-commercial-read-service";

/** Security-owned controls hosted in accounts workspace (explicit boundary). */
export type SecurityHostedAssetId =
  | "security-role-edit"
  | "security-classification-edit"
  | "security-create-internal-user"
  | "security-delete-user"
  | "security-platform-account-guards";

export type CustomerSuccessSurfaceId = "operations" | "commercial";

export type CustomerSuccessAssetDefinition = {
  id: CustomerSuccessAssetId;
  category: CustomerSuccessAssetCategory;
  ownerPath: string;
  queryKey?: string;
  surfaces: CustomerSuccessSurfaceId[];
};
