# PLATFORM-CAPABILITY-DISCOVERY-1 — Program Package

| Field | Value |
|-------|-------|
| **Program** | PLATFORM-CAPABILITY-DISCOVERY-1 |
| **Mode** | Architecture Authority · Read-Only Investigation |
| **Date** | 2026-07-30 |
| **Constraints** | No commit · No push · No deploy · No DB changes · No runtime changes · No refactor · No implementation · No ADRs · No domain renames |

---

## Mission

Produce the official **Platform Capability Catalog** SSOT describing every capability currently implemented (or formally planned) on the MineuQR platform — ownership, boundaries, dependencies, maturity, and documentation coverage — without modifying platform behavior.

## Deliverables

| # | Document | Purpose |
|---|----------|---------|
| 1 | [PLATFORM_CAPABILITY_CATALOG.md](./PLATFORM_CAPABILITY_CATALOG.md) | Per-capability SSOT entries |
| 2 | [CAPABILITY_TAXONOMY.md](./CAPABILITY_TAXONOMY.md) | Category grouping |
| 3 | [CAPABILITY_OWNERSHIP_MATRIX.md](./CAPABILITY_OWNERSHIP_MATRIX.md) | Ownership × DB × API × SSOT |
| 4 | [CAPABILITY_DEPENDENCY_GRAPH.md](./CAPABILITY_DEPENDENCY_GRAPH.md) | Upstream/downstream & cycles |
| 5 | [CAPABILITY_MATURITY_MATRIX.md](./CAPABILITY_MATURITY_MATRIX.md) | Maturity + evidence |
| 6 | [PLATFORM_COVERAGE_REPORT.md](./PLATFORM_COVERAGE_REPORT.md) | Adoption / gaps / hardening |
| 7 | [ARCHITECTURE_GAP_ANALYSIS.md](./ARCHITECTURE_GAP_ANALYSIS.md) | Architectural observations only |
| — | [INVESTIGATION-REPORT.md](./INVESTIGATION-REPORT.md) | Method, sources, verdict |

## Method (read-only)

1. Architecture hub: `docs/architecture/` (Constitution, ADR Registry, blueprints, diagrams)
2. Domain authority: `CROSS-DOMAIN-GOVERNANCE-1`, per-domain `*OWNERSHIP*.md`
3. Runtime map: `server/routers.ts`, `server/**`, `shared/**`, `drizzle/schema.ts`
4. Event planes: Order outbox, `opsTaxonomy`/`opsLog`, `auditEmitter`
5. Program maturity language from FINAL-REPORT / ADR Implementation Status columns

## Explicit non-goals

- No code or schema changes
- No ADR creation
- No implementation recommendations (gap analysis = observations only)
- No production certification decisions (maturity is investigative classification)
