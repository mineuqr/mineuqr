import { LAUNCH_READINESS_HEALTH_INPUTS } from "../health/healthDomain";
import type {
  LaunchReadinessAssetDefinition,
  LaunchReadinessEvidenceRef,
} from "./launchReadinessTypes";

export const LAUNCH_READINESS_DOMAIN_ID = "launch-readiness" as const;

/** REBUILD-5G — canonical Launch Readiness domain asset registry (ownership metadata). */
export const LAUNCH_READINESS_ASSET_DEFINITIONS: LaunchReadinessAssetDefinition[] = [
  // ── Routes & pages ──
  {
    id: "overview-route",
    category: "navigation",
    ownerPath: "lib/admin/routes/adminRoutes.ts",
    surfaces: ["overview"],
  },
  {
    id: "launch-readiness-route",
    category: "navigation",
    ownerPath: "lib/admin/routes/adminRoutes.ts",
    surfaces: ["launch-readiness"],
  },
  {
    id: "legacy-route-redirects",
    category: "legacy",
    ownerPath: "lib/admin/routes/adminRoutes.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "admin-dashboard-home",
    category: "shell",
    ownerPath: "pages/admin/AdminDashboardHome",
    surfaces: ["overview"],
  },
  {
    id: "admin-section-placeholder",
    category: "placeholder",
    ownerPath: "pages/admin/AdminSectionPlaceholder",
    surfaces: ["placeholder"],
  },
  {
    id: "placeholder-pages",
    category: "placeholder",
    ownerPath: "pages/admin/placeholderPages",
    surfaces: ["placeholder", "launch-readiness"],
  },
  {
    id: "admin-legacy-redirect",
    category: "legacy",
    ownerPath: "pages/admin/AdminLegacyRedirect",
    surfaces: ["infrastructure"],
  },

  // ── Overview governance (Launch Readiness owned) ──
  {
    id: "overview-welcome-section",
    category: "governance",
    ownerPath: "components/admin/domains/launch-readiness/LaunchReadinessGovernanceSection",
    surfaces: ["overview"],
  },
  {
    id: "overview-featured-shortcuts",
    category: "governance",
    ownerPath: "components/admin/domains/launch-readiness/LaunchReadinessGovernanceSection",
    surfaces: ["overview"],
  },
  {
    id: "overview-all-sections",
    category: "governance",
    ownerPath: "components/admin/domains/launch-readiness/LaunchReadinessGovernanceSection",
    surfaces: ["overview"],
  },
  {
    id: "overview-dashboard-composition",
    category: "readiness",
    ownerPath: "components/admin/domains/launch-readiness/LaunchReadinessOverviewComposition",
    surfaces: ["overview"],
  },
  {
    id: "nav-shortcut-card",
    category: "governance",
    ownerPath: "components/admin/sections/overview/NavShortcutCard",
    surfaces: ["overview"],
  },

  // ── Route registry & navigation shell ──
  {
    id: "route-registry-definitions",
    category: "navigation",
    ownerPath: "lib/admin/routes/adminRoutes.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "route-registry-resolver",
    category: "navigation",
    ownerPath: "lib/admin/routes/adminRouteRegistry.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "admin-navigation-shim",
    category: "navigation",
    ownerPath: "lib/admin/adminNavigation.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "legacy-route-metadata",
    category: "legacy",
    ownerPath: "lib/admin/routes/adminRoutes.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "admin-shell-sidebar",
    category: "shell",
    ownerPath: "components/admin/layout/AdminDashboardSidebar",
    surfaces: ["infrastructure"],
  },
  {
    id: "admin-shell-operations",
    category: "shell",
    ownerPath: "components/admin/layout/AdminOperationsShell",
    surfaces: ["infrastructure"],
  },
  {
    id: "admin-shell-breadcrumbs",
    category: "shell",
    ownerPath: "components/admin/layout/AdminShellBreadcrumbs",
    surfaces: ["infrastructure"],
  },
  {
    id: "admin-dash-styles",
    category: "shell",
    ownerPath: "components/admin/layout/adminDashStyles",
    surfaces: ["infrastructure"],
  },
  {
    id: "admin-page-section",
    category: "shell",
    ownerPath: "components/admin/sections/AdminPageSection",
    surfaces: ["infrastructure"],
  },
  {
    id: "admin-section-contracts",
    category: "governance",
    ownerPath: "components/admin/sections/adminSectionContracts.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "placeholder-route-section",
    category: "placeholder",
    ownerPath: "components/admin/sections/placeholder/AdminRoutePlaceholderSection",
    surfaces: ["placeholder"],
  },
  {
    id: "placeholder-coming-soon-indicator",
    category: "placeholder",
    ownerPath: "components/admin/sections/placeholder/PlaceholderComingSoonIndicator",
    surfaces: ["placeholder"],
  },

  // ── Certification & readiness evaluation ──
  {
    id: "server-deployment-readiness",
    category: "server",
    ownerPath: "server/_core/deploymentReadiness.ts",
    surfaces: ["infrastructure", "launch-readiness"],
  },
  {
    id: "helper-feature-visibility",
    category: "helper",
    ownerPath: "lib/commercial/featureVisibility.ts",
    surfaces: ["launch-readiness"],
  },
  {
    id: "helper-ui-visibility-inventory",
    category: "helper",
    ownerPath: "lib/commercial/featureVisibility.ts",
    surfaces: ["launch-readiness"],
  },
  {
    id: "readiness-scorecard",
    category: "scorecard",
    ownerPath: "components/admin/domains/launch-readiness/LaunchReadinessScorecardSection",
    surfaces: ["launch-readiness"],
  },
  {
    id: "release-gate-deprecated-apis",
    category: "release-gate",
    ownerPath: "server/routers.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "launch-certification-protocol",
    category: "process",
    ownerPath: "docs/commercial-audit/ASN-5A-COMMERCIAL-DATA-REALITY-AUDIT.md",
    surfaces: ["launch-readiness"],
  },
  {
    id: "rebuild-program-docs",
    category: "process",
    ownerPath: "docs/commercial-audit/",
    surfaces: ["infrastructure"],
  },
  {
    id: "launch-readiness-dependencies",
    category: "evidence",
    ownerPath: "components/admin/domains/launch-readiness/LaunchReadinessDependencySection",
    surfaces: ["launch-readiness"],
  },

  // ── Evidence consumption (other domains own; Launch Readiness decides) ──
  {
    id: "evidence-reports-commercial-readiness",
    category: "evidence",
    ownerPath: "server/commercial/adminDashboardRouter.ts",
    queryKey: "admin.getCommercialOverview",
    surfaces: ["launch-readiness"],
    evidenceFrom: "reports",
  },
  {
    id: "evidence-reports-schema-metadata",
    category: "evidence",
    ownerPath: "components/admin/domains/reports/ReportsMetadataSection",
    queryKey: "admin.getCommercialOverview",
    surfaces: ["launch-readiness"],
    evidenceFrom: "reports",
  },
  {
    id: "evidence-cs-lifecycle-readiness",
    category: "evidence",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessHealthSection",
    queryKey: "admin.getCommercialOverview",
    surfaces: ["launch-readiness"],
    evidenceFrom: "customer-success",
  },
  {
    id: "evidence-security-governance-status",
    category: "evidence",
    ownerPath: "server/_core/assertAdminAccess.ts",
    surfaces: ["launch-readiness"],
    evidenceFrom: "security",
  },
  {
    id: "evidence-health-runtime-inputs",
    category: "evidence",
    ownerPath: "components/admin/domains/health/HealthReadinessInputsSection",
    surfaces: ["launch-readiness"],
    evidenceFrom: "health",
  },
];

/** Cross-domain evidence refs — Launch Readiness consumes; source domains own. */
export const LAUNCH_READINESS_EVIDENCE_DEPENDENCIES: LaunchReadinessEvidenceRef[] = [
  {
    source: "reports",
    assetId: "commercial-executive-kpis",
    ownerPath: "components/admin/domains/reports/ReportsExecutiveSection",
    consumptionPurpose: "Commercial readiness — executive snapshot for certification",
  },
  {
    source: "reports",
    assetId: "commercial-metadata-panel",
    ownerPath: "components/admin/domains/reports/ReportsMetadataSection",
    consumptionPurpose: "Schema version and report metadata for launch certification",
  },
  {
    source: "customer-success",
    assetId: "subscription-health",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessHealthSection",
    consumptionPurpose: "Customer lifecycle readiness inputs",
  },
  {
    source: "customer-success",
    assetId: "needs-attention",
    ownerPath: "components/admin/domains/customer-success/CustomerSuccessAttentionSection",
    consumptionPurpose: "Lifecycle attention signals for go-live assessment",
  },
  {
    source: "security",
    assetId: "server-assert-admin-access",
    ownerPath: "server/_core/assertAdminAccess.ts",
    consumptionPurpose: "Governance status — admin gate certification input",
  },
  {
    source: "security",
    assetId: "auth-gate-useAuthGate",
    ownerPath: "_core/hooks/useAuthGate",
    consumptionPurpose: "Access governance readiness for launch shell",
  },
  {
    source: "health",
    assetId: "input-email-health-probe",
    ownerPath: "server/email-config.test.ts",
    consumptionPurpose: "Email health probe pass/fail for certification",
  },
  {
    source: "health",
    assetId: "input-runtime-health-signals",
    ownerPath: "server/_core/healthSignals.ts",
    consumptionPurpose: "Runtime operational signal health for certification",
  },
];

/** Health readiness input asset IDs consumed by Launch Readiness (re-export for registry alignment). */
export const LAUNCH_READINESS_HEALTH_EVIDENCE_INPUTS = LAUNCH_READINESS_HEALTH_INPUTS;

export const LAUNCH_READINESS_COMPOSITION_SECTIONS = [
  "LaunchReadinessScorecardSection",
  "LaunchReadinessCertificationSection",
  "LaunchReadinessGateSection",
  "LaunchReadinessGovernanceSection",
  "LaunchReadinessDependencySection",
  "LaunchReadinessOverviewComposition",
] as const;
