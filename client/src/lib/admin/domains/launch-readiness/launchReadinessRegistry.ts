import {
  LAUNCH_READINESS_ASSET_DEFINITIONS,
  LAUNCH_READINESS_COMPOSITION_SECTIONS,
  LAUNCH_READINESS_DOMAIN_ID,
  LAUNCH_READINESS_EVIDENCE_DEPENDENCIES,
  LAUNCH_READINESS_HEALTH_EVIDENCE_INPUTS,
} from "./launchReadinessDomain";
import type {
  LaunchReadinessAssetDefinition,
  LaunchReadinessAssetId,
  LaunchReadinessEvidenceRef,
  LaunchReadinessEvidenceSource,
  LaunchReadinessSurfaceId,
} from "./launchReadinessTypes";

const ASSET_BY_ID = new Map<LaunchReadinessAssetId, LaunchReadinessAssetDefinition>(
  LAUNCH_READINESS_ASSET_DEFINITIONS.map((asset) => [asset.id, asset])
);

export {
  LAUNCH_READINESS_DOMAIN_ID,
  LAUNCH_READINESS_ASSET_DEFINITIONS,
  LAUNCH_READINESS_COMPOSITION_SECTIONS,
  LAUNCH_READINESS_EVIDENCE_DEPENDENCIES,
  LAUNCH_READINESS_HEALTH_EVIDENCE_INPUTS,
};

export function getLaunchReadinessAsset(id: LaunchReadinessAssetId): LaunchReadinessAssetDefinition {
  const asset = ASSET_BY_ID.get(id);
  if (!asset) {
    throw new Error(`Unknown launch readiness asset id: ${id}`);
  }
  return asset;
}

export function getLaunchReadinessAssetsBySurface(
  surface: LaunchReadinessSurfaceId
): LaunchReadinessAssetDefinition[] {
  return LAUNCH_READINESS_ASSET_DEFINITIONS.filter((asset) =>
    asset.surfaces.includes(surface)
  );
}

export function getLaunchReadinessAssetsByCategory(
  category: LaunchReadinessAssetDefinition["category"]
): LaunchReadinessAssetDefinition[] {
  return LAUNCH_READINESS_ASSET_DEFINITIONS.filter((asset) => asset.category === category);
}

export function getLaunchReadinessEvidenceAssets(): LaunchReadinessAssetDefinition[] {
  return LAUNCH_READINESS_ASSET_DEFINITIONS.filter(
    (asset) => asset.category === "evidence" || asset.evidenceFrom !== undefined
  );
}

export function getLaunchReadinessEvidenceBySource(
  source: LaunchReadinessEvidenceSource
): LaunchReadinessEvidenceRef[] {
  return LAUNCH_READINESS_EVIDENCE_DEPENDENCIES.filter((ref) => ref.source === source);
}

export function getLaunchReadinessCertificationAssets(): LaunchReadinessAssetDefinition[] {
  return LAUNCH_READINESS_ASSET_DEFINITIONS.filter((asset) =>
    [
      "server-deployment-readiness",
      "launch-certification-protocol",
      "readiness-scorecard",
    ].includes(asset.id)
  );
}

export function getLaunchReadinessReleaseGateAssets(): LaunchReadinessAssetDefinition[] {
  return getLaunchReadinessAssetsByCategory("release-gate");
}
