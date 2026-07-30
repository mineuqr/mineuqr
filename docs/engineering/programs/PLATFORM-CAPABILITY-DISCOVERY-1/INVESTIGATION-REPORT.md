# INVESTIGATION REPORT — PLATFORM-CAPABILITY-DISCOVERY-1

| Field | Value |
|-------|-------|
| **Program** | PLATFORM-CAPABILITY-DISCOVERY-1 |
| **Mode** | Architecture Authority · Read-Only Investigation |
| **Date** | 2026-07-30 |
| **Constraints honored** | No commit · No push · No deploy · No DB/runtime changes · No refactor · No implementation · No ADRs |

---

## Mission result

Produced the first **platform-wide Platform Capability Catalog** package for MineuQR: 46 capabilities with ownership, SSOT, APIs, events, dependencies, maturity, coverage, and architectural gap observations.

---

## Investigation method

1. Architecture hub (`docs/architecture` Constitution, ADR Registry, blueprints, diagrams)
2. Cross-domain authority (`CROSS-DOMAIN-GOVERNANCE-1/DOMAIN-AUTHORITY-MATRIX.md`)
3. Domain program ownership packages (Commercial Catalog, Subscription, Tenant Identity, Reporting, FSP/CRMP, etc.)
4. Runtime inventory (`server/routers.ts` namespaces; `server/**`; `shared/**`; `drizzle/schema.ts`)
5. Event planes (Order outbox; `opsTaxonomy`/`opsLog`; `auditEmitter`)
6. Integration scan (PayPal, Tap, Cloudflare R2 / CF-IPCountry, web-push; **no AI runtime**)

---

## Key findings

1. **No prior unified capability catalog** existed; ownership is distributed across ADRs, constitutions, and domain OWNERSHIP docs.
2. **Order remains constitutional core**; financial money authority is **Check**, not Order or Register.
3. **Commercial plane is dual-structured:** Catalog SSOT for offerings; Snapshot/Subscription for entitlement runtime when bound.
4. **Three event planes** operate in parallel (domain outbox, OPS taxonomy, audit DB).
5. **Domain landscape diagram is stale** relative to Session/Kitchen/Printing runtime.
6. **ADR Implementation Status lags** parts of the live FSP stack.
7. **AI is Planned only** (entitlement keys; no runtime).

---

## Deliverables checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Program package | [00-PROGRAM-PACKAGE.md](./00-PROGRAM-PACKAGE.md) | Done |
| Capability catalog | [PLATFORM_CAPABILITY_CATALOG.md](./PLATFORM_CAPABILITY_CATALOG.md) | Done (46) |
| Taxonomy | [CAPABILITY_TAXONOMY.md](./CAPABILITY_TAXONOMY.md) | Done |
| Ownership matrix | [CAPABILITY_OWNERSHIP_MATRIX.md](./CAPABILITY_OWNERSHIP_MATRIX.md) | Done |
| Dependency graph | [CAPABILITY_DEPENDENCY_GRAPH.md](./CAPABILITY_DEPENDENCY_GRAPH.md) | Done |
| Maturity matrix | [CAPABILITY_MATURITY_MATRIX.md](./CAPABILITY_MATURITY_MATRIX.md) | Done |
| Coverage report | [PLATFORM_COVERAGE_REPORT.md](./PLATFORM_COVERAGE_REPORT.md) | Done |
| Gap analysis | [ARCHITECTURE_GAP_ANALYSIS.md](./ARCHITECTURE_GAP_ANALYSIS.md) | Done |

---

## Success criteria mapping

| Criterion | Met |
|-----------|-----|
| Every capability has clear ownership | ✓ (matrix + catalog) |
| Clear boundary | ✓ (with ambiguities documented in gaps) |
| Clear dependencies | ✓ (dependency graph) |
| Clear maturity | ✓ (maturity matrix + evidence) |
| Clear business purpose | ✓ (catalog Purpose/Business Value) |
| Clear runtime responsibility | ✓ (services/APIs/events) |
| Platform understandable from catalog | ✓ (intended SSOT entry) |
| No code/architecture mutation | ✓ |

---

## Verdict

# READY FOR ARCHITECTURE AUTHORITY REVIEW

**Authorize** this package as the investigative **Platform Capability Catalog SSOT** for MineuQR under PLATFORM-CAPABILITY-DISCOVERY-1.

No commits. No deployment. No runtime changes.
