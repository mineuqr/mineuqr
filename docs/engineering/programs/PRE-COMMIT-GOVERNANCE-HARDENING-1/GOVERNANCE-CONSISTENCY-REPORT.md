# Governance Consistency Report

| Field | Value |
|-------|-------|
| **Program** | PRE-COMMIT-GOVERNANCE-HARDENING-1 |
| **Date** | 2026-07-27 |

## Phase 1 — Repository consistency

| Check | Result | Notes |
|-------|--------|-------|
| Duplicate constitutions | **PASS** | One file per Unique Name under `docs/architecture/constitution/` |
| Duplicate Ops manuals | **PASS** | Single `operations/` set + index |
| Orphan governance programs | **PASS** | Packages linked from Governance.md / Registry |
| Broken internal links (sampled) | **PASS** | Governance.md, Ops index, Registry paths resolve |
| Architecture Ops mis-registered as constitution | **PASS** | Explicitly marked “not a constitution” |
| Uncommitted non-governance work | **OBSERVATION** | `REPORTING-VISUAL-HIERARCHY-1` presentation code dirty — **exclude** from governance baseline commit |

## Duplicate / conflict scan

| Area | Finding |
|------|---------|
| Reporting constitutions | No duplicate rule books; extensions correctly “extend” base |
| Process docs | `docs/architecture/governance/*` + `operations/*` — Ops references legacy without replacing |
| ADR numbering | Gap at **015** and **029** (no files) — historical; not a duplicate |

## Cross-index sync

| Index | Sync |
|-------|------|
| Constitution Registry ↔ constitution files | **Aligned** (all registered constitutions exist) |
| Governance.md ↔ Registry | **Aligned** |
| Ops Index ↔ 12 manuals | **Aligned** |
| ADR Registry ↔ `docs/architecture/adrs/` | **Aligned** for listed IDs 001–014, 016–028, 030–033 |

## Hardening applied this program

- CV-01 metadata normalization (Version **1.0.0**, Status **Pending Review**, Previous/Successor fields) on Reporting + Enforcement + Mirror constitutions  
- Registry / readiness documentation for commit scope  
- This audit package  

## Verdict contribution

Consistency is sufficient for a **governance documentation baseline** with minor observations (dirty visual-hierarchy tree; CV status still Pending Review by design).
