# REBUILD-5GA — Launch Readiness Domain Registry

**Program:** ADMIN-DASHBOARD-REBUILD-5G  
**Phase:** 5GA — Launch Readiness Domain Registry  
**Mode:** Structural extraction (ownership only)

---

## Created: `client/src/lib/admin/domains/launch-readiness/`

| File | Responsibility |
|------|----------------|
| `launchReadinessTypes.ts` | `LaunchReadinessAssetId`, categories, `LaunchReadinessEvidenceSource` |
| `launchReadinessDomain.ts` | `LAUNCH_READINESS_DOMAIN_ID`, 37 asset definitions, evidence dependencies |
| `launchReadinessRegistry.ts` | `getLaunchReadinessAsset`, evidence and certification helpers |
| `index.ts` | Barrel exports |

---

## Domain Identity

```ts
LAUNCH_READINESS_DOMAIN_ID = "launch-readiness"
```

---

## Domain Principle

Launch Readiness **does not generate** operational signals. It **consumes evidence** from:

| Source domain | Evidence purpose |
|---------------|------------------|
| Reports | Commercial readiness, schema metadata |
| Customer Success | Lifecycle readiness |
| Security | Governance status |
| Health | Runtime probe inputs |

Launch Readiness owns the **final readiness assessment** and **go-live decision**.

---

## Asset Categories

| Category | Assets |
|----------|--------|
| `navigation` | Route registry, overview/launch-readiness routes |
| `shell` | Admin console frame, dashboard home |
| `governance` | Overview welcome, shortcuts, section hub |
| `placeholder` | Domain placeholder pages and sections |
| `legacy` | Legacy redirect metadata |
| `certification` / `server` | `deploymentReadiness` |
| `helper` | `featureVisibility` inventory |
| `release-gate` | Deprecated API retirement queue |
| `scorecard` | Readiness scorecard (future UI) |
| `evidence` | Cross-domain consumption refs |
| `process` | ASN-5A protocol, REBUILD docs |

---

## Composition Sections

```ts
LAUNCH_READINESS_COMPOSITION_SECTIONS = [
  "LaunchReadinessScorecardSection",
  "LaunchReadinessCertificationSection",
  "LaunchReadinessGateSection",
  "LaunchReadinessGovernanceSection",
  "LaunchReadinessDependencySection",
  "LaunchReadinessOverviewComposition",
]
```

No route or navigation changes in this phase.
