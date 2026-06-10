# REBUILD-5GB — Launch Readiness Ownership Adoption

**Program:** ADMIN-DASHBOARD-REBUILD-5G  
**Phase:** 5GB — Launch Readiness Asset Adoption

---

## Registered Launch Readiness Assets (REBUILD-5B → 5G)

### Certification & readiness evaluation

| Asset ID | Owner path |
|----------|------------|
| `server-deployment-readiness` | `server/_core/deploymentReadiness.ts` |
| `helper-feature-visibility` | `lib/commercial/featureVisibility.ts` |
| `helper-ui-visibility-inventory` | `lib/commercial/featureVisibility.ts` |
| `readiness-scorecard` | `LaunchReadinessScorecardSection` (future UI) |
| `release-gate-deprecated-apis` | `server/routers.ts` (retirement queue) |
| `launch-certification-protocol` | ASN-5A data readiness protocol |

### Admin shell & governance

| Asset ID | Owner path |
|----------|------------|
| `admin-dashboard-home` | `pages/admin/AdminDashboardHome` |
| `overview-dashboard-composition` | `LaunchReadinessOverviewComposition` |
| `overview-welcome-section` | Overview welcome (LR governance) |
| `overview-featured-shortcuts` | Navigation hub |
| `overview-all-sections` | Console section index |
| `route-registry-definitions` | `lib/admin/routes/adminRoutes.ts` |
| `route-registry-resolver` | `lib/admin/routes/adminRouteRegistry.ts` |
| `admin-navigation-shim` | `lib/admin/adminNavigation.ts` |
| `admin-shell-*` | Sidebar, operations shell, breadcrumbs, styles |
| `admin-section-contracts` | Section metadata contracts |

### Placeholder & legacy

| Asset ID | Surface |
|----------|---------|
| `launch-readiness-route` | `/admin/launch-readiness` placeholder |
| `placeholder-pages` | Domain placeholder factory |
| `admin-section-placeholder` | Placeholder page shell |
| `legacy-route-redirects` | `/statistics`, `/users`, `/super-admin` |

---

## Evidence Consumption (not ownership)

Documented in `LAUNCH_READINESS_EVIDENCE_DEPENDENCIES`:

| Source | Consumed for |
|--------|------------|
| Reports | Executive KPIs, schema metadata |
| Customer Success | Subscription health, needs-attention |
| Security | Admin gate, auth governance |
| Health | Email probe, runtime health signals |

Health input IDs re-exported via `LAUNCH_READINESS_HEALTH_EVIDENCE_INPUTS`.

---

## Single Owner Rule

Every launch readiness asset has exactly one owner in `LAUNCH_READINESS_ASSET_DEFINITIONS`. Evidence refs document consumption only — ownership remains with source domains.
