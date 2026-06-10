import {
  HEALTH_ASSET_DEFINITIONS,
  HEALTH_COMPOSITION_SECTIONS,
  HEALTH_DOMAIN_ID,
  LAUNCH_READINESS_HEALTH_INPUTS,
} from "./healthDomain";
import type { HealthAssetDefinition, HealthAssetId, HealthSurfaceId } from "./healthTypes";

const ASSET_BY_ID = new Map<HealthAssetId, HealthAssetDefinition>(
  HEALTH_ASSET_DEFINITIONS.map((asset) => [asset.id, asset])
);

export {
  HEALTH_DOMAIN_ID,
  HEALTH_ASSET_DEFINITIONS,
  HEALTH_COMPOSITION_SECTIONS,
  LAUNCH_READINESS_HEALTH_INPUTS,
};

export function getHealthAsset(id: HealthAssetId): HealthAssetDefinition {
  const asset = ASSET_BY_ID.get(id);
  if (!asset) {
    throw new Error(`Unknown health asset id: ${id}`);
  }
  return asset;
}

export function getHealthAssetsBySurface(surface: HealthSurfaceId): HealthAssetDefinition[] {
  return HEALTH_ASSET_DEFINITIONS.filter((asset) => asset.surfaces.includes(surface));
}

export function getHealthAssetsByCategory(
  category: HealthAssetDefinition["category"]
): HealthAssetDefinition[] {
  return HEALTH_ASSET_DEFINITIONS.filter((asset) => asset.category === category);
}

export function getHealthDiagnosticsAssets(): HealthAssetDefinition[] {
  return getHealthAssetsByCategory("diagnostics").concat(
    HEALTH_ASSET_DEFINITIONS.filter((asset) => asset.category === "page")
  );
}

export function getHealthMonitoringAssets(): HealthAssetDefinition[] {
  return HEALTH_ASSET_DEFINITIONS.filter(
    (asset) =>
      asset.category === "monitoring" ||
      asset.category === "signals" ||
      asset.surfaces.includes("monitoring")
  );
}

export function getHealthReadinessInputAssets(): HealthAssetDefinition[] {
  return LAUNCH_READINESS_HEALTH_INPUTS.map((id) => getHealthAsset(id));
}
