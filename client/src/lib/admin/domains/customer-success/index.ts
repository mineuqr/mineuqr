export type {
  CustomerSuccessAssetCategory,
  CustomerSuccessAssetDefinition,
  CustomerSuccessAssetId,
  CustomerSuccessDomainId,
  CustomerSuccessSurfaceId,
  SecurityHostedAssetId,
} from "./customerSuccessTypes";

export {
  CUSTOMER_SUCCESS_ASSET_DEFINITIONS,
  CUSTOMER_SUCCESS_COMPOSITION_SECTIONS,
  CUSTOMER_SUCCESS_DOMAIN_ID,
  SECURITY_HOSTED_IN_ACCOUNTS,
} from "./customerSuccessDomain";

export {
  getCustomerSuccessAsset,
  getCustomerSuccessAssetsBySurface,
} from "./customerSuccessRegistry";
