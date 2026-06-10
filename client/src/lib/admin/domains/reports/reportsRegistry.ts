import { REPORTS_ASSET_DEFINITIONS, REPORTS_COMPOSITION_SECTIONS, REPORTS_DOMAIN_ID } from "./reportsDomain";
import type { ReportsAssetDefinition, ReportsAssetId, ReportsSurfaceId } from "./reportsTypes";

const ASSET_BY_ID = new Map<ReportsAssetId, ReportsAssetDefinition>(
  REPORTS_ASSET_DEFINITIONS.map((asset) => [asset.id, asset])
);

export { REPORTS_DOMAIN_ID, REPORTS_ASSET_DEFINITIONS, REPORTS_COMPOSITION_SECTIONS };

export function getReportsAsset(id: ReportsAssetId): ReportsAssetDefinition {
  const asset = ASSET_BY_ID.get(id);
  if (!asset) {
    throw new Error(`Unknown reports asset id: ${id}`);
  }
  return asset;
}

export function getReportsAssetsBySurface(surface: ReportsSurfaceId): ReportsAssetDefinition[] {
  return REPORTS_ASSET_DEFINITIONS.filter((asset) => asset.surfaces.includes(surface));
}

export function getReportsAssetsByCategory(
  category: ReportsAssetDefinition["category"]
): ReportsAssetDefinition[] {
  return REPORTS_ASSET_DEFINITIONS.filter((asset) => asset.category === category);
}

export function getReportsKpiAssets(): ReportsAssetDefinition[] {
  return getReportsAssetsByCategory("kpi");
}

export function getReportsExportAssets(): ReportsAssetDefinition[] {
  return REPORTS_ASSET_DEFINITIONS.filter(
    (asset) => asset.category === "export"
  );
}
