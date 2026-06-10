/** REBUILD-5G — Launch Readiness platform domain type contracts. */

export type LaunchReadinessDomainId = "launch-readiness";

export type LaunchReadinessAssetCategory =
  | "certification"
  | "readiness"
  | "governance"
  | "release-gate"
  | "scorecard"
  | "shell"
  | "navigation"
  | "placeholder"
  | "legacy"
  | "api"
  | "helper"
  | "server"
  | "process"
  | "evidence";

export type LaunchReadinessEvidenceSource =
  | "reports"
  | "customer-success"
  | "security"
  | "health";

export type LaunchReadinessAssetId =
  | "overview-route"
  | "launch-readiness-route"
  | "legacy-route-redirects"
  | "admin-dashboard-home"
  | "admin-section-placeholder"
  | "placeholder-pages"
  | "admin-legacy-redirect"
  | "overview-welcome-section"
  | "overview-featured-shortcuts"
  | "overview-all-sections"
  | "overview-dashboard-composition"
  | "nav-shortcut-card"
  | "route-registry-definitions"
  | "route-registry-resolver"
  | "admin-navigation-shim"
  | "legacy-route-metadata"
  | "admin-shell-sidebar"
  | "admin-shell-operations"
  | "admin-shell-breadcrumbs"
  | "admin-dash-styles"
  | "admin-page-section"
  | "admin-section-contracts"
  | "placeholder-route-section"
  | "placeholder-coming-soon-indicator"
  | "server-deployment-readiness"
  | "helper-feature-visibility"
  | "helper-ui-visibility-inventory"
  | "readiness-scorecard"
  | "release-gate-deprecated-apis"
  | "launch-certification-protocol"
  | "rebuild-program-docs"
  | "launch-readiness-dependencies"
  | "evidence-reports-commercial-readiness"
  | "evidence-reports-schema-metadata"
  | "evidence-cs-lifecycle-readiness"
  | "evidence-security-governance-status"
  | "evidence-health-runtime-inputs";

export type LaunchReadinessSurfaceId =
  | "overview"
  | "launch-readiness"
  | "placeholder"
  | "infrastructure";

export type LaunchReadinessAssetDefinition = {
  id: LaunchReadinessAssetId;
  category: LaunchReadinessAssetCategory;
  /** Primary component or module path. */
  ownerPath: string;
  /** tRPC procedure when applicable. */
  queryKey?: string;
  surfaces: LaunchReadinessSurfaceId[];
  /** When true, asset is evidence owned by another domain — Launch Readiness consumes only. */
  evidenceFrom?: LaunchReadinessEvidenceSource;
};

export type LaunchReadinessEvidenceRef = {
  source: LaunchReadinessEvidenceSource;
  assetId: string;
  ownerPath: string;
  consumptionPurpose: string;
};
