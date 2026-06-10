import {
  CUSTOMER_SUCCESS_ASSET_DEFINITIONS,
  CUSTOMER_SUCCESS_COMPOSITION_SECTIONS,
  CUSTOMER_SUCCESS_DOMAIN_ID,
  SECURITY_HOSTED_IN_ACCOUNTS,
} from "./customerSuccessDomain";
import type {
  CustomerSuccessAssetDefinition,
  CustomerSuccessAssetId,
  CustomerSuccessSurfaceId,
} from "./customerSuccessTypes";

const ASSET_BY_ID = new Map<CustomerSuccessAssetId, CustomerSuccessAssetDefinition>(
  CUSTOMER_SUCCESS_ASSET_DEFINITIONS.map((asset) => [asset.id, asset])
);

export {
  CUSTOMER_SUCCESS_DOMAIN_ID,
  CUSTOMER_SUCCESS_ASSET_DEFINITIONS,
  CUSTOMER_SUCCESS_COMPOSITION_SECTIONS,
  SECURITY_HOSTED_IN_ACCOUNTS,
};

export function getCustomerSuccessAsset(id: CustomerSuccessAssetId): CustomerSuccessAssetDefinition {
  const asset = ASSET_BY_ID.get(id);
  if (!asset) {
    throw new Error(`Unknown customer success asset id: ${id}`);
  }
  return asset;
}

export function getCustomerSuccessAssetsBySurface(
  surface: CustomerSuccessSurfaceId
): CustomerSuccessAssetDefinition[] {
  return CUSTOMER_SUCCESS_ASSET_DEFINITIONS.filter((asset) =>
    asset.surfaces.includes(surface)
  );
}
