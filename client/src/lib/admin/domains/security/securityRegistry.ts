import {
  SECURITY_ACCOUNTS_HOSTED_ASSETS,
  SECURITY_ASSET_DEFINITIONS,
  SECURITY_COMPOSITION_SECTIONS,
  SECURITY_DOMAIN_ID,
} from "./securityDomain";
import type {
  SecurityAssetDefinition,
  SecurityAssetId,
  SecuritySurfaceId,
} from "./securityTypes";

const ASSET_BY_ID = new Map<SecurityAssetId, SecurityAssetDefinition>(
  SECURITY_ASSET_DEFINITIONS.map((asset) => [asset.id, asset])
);

export {
  SECURITY_DOMAIN_ID,
  SECURITY_ASSET_DEFINITIONS,
  SECURITY_COMPOSITION_SECTIONS,
  SECURITY_ACCOUNTS_HOSTED_ASSETS,
};

export function getSecurityAsset(id: SecurityAssetId): SecurityAssetDefinition {
  const asset = ASSET_BY_ID.get(id);
  if (!asset) {
    throw new Error(`Unknown security asset id: ${id}`);
  }
  return asset;
}

export function getSecurityAssetsBySurface(
  surface: SecuritySurfaceId
): SecurityAssetDefinition[] {
  return SECURITY_ASSET_DEFINITIONS.filter((asset) =>
    asset.surfaces.includes(surface)
  );
}

export function getSecurityAssetsByCategory(
  category: SecurityAssetDefinition["category"]
): SecurityAssetDefinition[] {
  return SECURITY_ASSET_DEFINITIONS.filter((asset) => asset.category === category);
}

export function getSecurityAccountsHostedAssets(): SecurityAssetDefinition[] {
  return SECURITY_ACCOUNTS_HOSTED_ASSETS.map((id) => getSecurityAsset(id));
}

export function getSecurityGovernanceAssets(): SecurityAssetDefinition[] {
  return getSecurityAssetsByCategory("governance");
}

export function getSecurityAuthAssets(): SecurityAssetDefinition[] {
  return SECURITY_ASSET_DEFINITIONS.filter(
    (asset) => asset.category === "auth" || asset.id.startsWith("auth-gate-")
  );
}

export function getSecurityDiagnosticsAssets(): SecurityAssetDefinition[] {
  return getSecurityAssetsByCategory("diagnostics").concat(
    SECURITY_ASSET_DEFINITIONS.filter((asset) => asset.category === "server")
  );
}
