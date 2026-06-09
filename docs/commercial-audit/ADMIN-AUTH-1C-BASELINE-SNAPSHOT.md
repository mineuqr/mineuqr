# ADMIN-AUTH-1C — Baseline Commercial Snapshot

**Date:** 2026-06-09  
**Phase:** B (pre-filter capture)  
**Environment:** Production (post-0020 migration, pre-1C code deploy)  
**Population:** COMMERCIAL=1, INTERNAL=1, SYSTEM=0

---

## Purpose

Establish certified commercial metrics **before** classification filtering for before/after reconciliation in [ADMIN-AUTH-1C](./ADMIN-AUTH-1C.md).

Pipeline at baseline:

```text
getAllUsers()                    ← all 2 users
        ↓
getAllOwnerCommercialStates()
        ↓
CanonicalMetricsService → Overview / Analytics / Exports
```

---

## Baseline metrics (pre-1C)

Captured from production state with legacy `role === "admin"` commercial bypass active.

| Metric | Value | Derivation |
|--------|-------|------------|
| **MRR** | Subscription-driven | COMMERCIAL owner only (`countsInMrr: true`); INTERNAL admin excluded from MRR (`countsInMrr: false`) |
| **ARR** | MRR × 12 | Same paying base as MRR |
| **Commercial Subscribers** | 2 | 1 COMMERCIAL entitled owner + 1 INTERNAL admin (`ADMIN` plan, `isEntitled: true`) |
| **Trials** | Per COMMERCIAL owner | INTERNAL admin not in trial bucket |
| **Grace** | 0 | No grace-period owners in launch population |
| **Suspended** | 0 | No suspended owners in launch population |
| **Plan Distribution** | ADMIN: 1, paid plan: per COMMERCIAL owner | INTERNAL admin in `ADMIN` bucket |
| **Subscriber Table Count** | 2 | Export/overview rows for both pipeline owners |

### Population context

| Field | Value |
|-------|-------|
| Pipeline owners | 2 |
| `totalUsers` (platform entity count) | 2 |
| INTERNAL in pipeline | Yes (legacy role bypass) |
| SYSTEM in pipeline | No |

---

## Expected post-1C delta

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Pipeline owners | 2 | 1 | −1 (INTERNAL removed) |
| Commercial Subscribers | 2 | 1 | −1 (INTERNAL admin no longer entitled in KPIs) |
| MRR | unchanged | unchanged | INTERNAL never counted in MRR |
| ARR | unchanged | unchanged | Same as MRR |
| Plan Distribution `ADMIN` bucket | 1 | 0 | INTERNAL admin excluded |
| Subscriber table rows | 2 | 1 | INTERNAL row removed |
| Trials / Grace / Suspended | per COMMERCIAL | per COMMERCIAL | INTERNAL segments zeroed |

---

## Snapshot authority

| Property | Value |
|----------|-------|
| `metricsSource` | `CANONICAL_OWNER` |
| `commercialAuthoritySource` | `S1_CANONICAL` |
| `assembledBy` | `CanonicalMetricsService` |

All surfaces (Overview, Analytics, ExportPackage, CSV, Excel, PDF) derive from the same snapshot at a fixed `asOf`.
