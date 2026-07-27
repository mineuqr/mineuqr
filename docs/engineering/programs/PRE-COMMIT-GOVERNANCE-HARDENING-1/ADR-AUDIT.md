# ADR Audit

| Field | Value |
|-------|-------|
| **Program** | PRE-COMMIT-GOVERNANCE-HARDENING-1 |
| **Date** | 2026-07-27 |

## File ↔ Registry

| Check | Result |
|-------|--------|
| Every ADR-Registry row 001–014, 016–028, 030–033 has a file | **PASS** |
| Every `docs/architecture/adrs/ADR-ARCH-*.md` appears in Registry | **PASS** (031–033 included) |
| ADR-ARCH-015 file | **Absent** — numbering gap (observation) |
| ADR-ARCH-029 file | **Absent** — numbering gap (observation) |

## Cross-domain / Reporting references

| Reference source | ADRs cited | Valid? |
|------------------|------------|--------|
| Enterprise Domain Authority Matrix | 001, 007, 020, 022, 023, 026, 028, 030, 032, 033 | Yes (files exist) |
| KPI / Settlement plane docs | 026, 032, 033 | Yes |
| Printing retirement | ADR-ARCH-012 + RESET-1 narrative | Yes |

## Supersession

| Check | Result |
|-------|--------|
| Registry marks Supersedes where applicable | Present on several rows |
| No audit evidence of treating Deprecated ADR as current in new constitutions | **PASS** (new docs cite Accepted financial ADRs) |

## Numbering consistency

- Prefix `ADR-ARCH-NNN` consistent  
- Gaps 015 / 029 are historical holes — do **not** invent placeholder ADRs in this program  

## Ops alignment

ADR-Operations maps Ops lifecycle onto constitutional `ADR-Lifecycle.md` without replacing it — **no conflict**.
