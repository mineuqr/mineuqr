# ADMIN-AUTH-1A — Account Classification Foundation

**Date:** 2026-06-09  
**Status:** Complete (design only — no production changes)  
**Next:** ADMIN-AUTH-1B Internal Staff Accounts

**Phase A detail:** [ADMIN-AUTH-1A-ACCOUNT-MODEL-AUDIT.md](./ADMIN-AUTH-1A-ACCOUNT-MODEL-AUDIT.md)

---

## Objective

Introduce a permanent **account classification** layer independent from authorization `role` and independent from commercial **subscription** state.

Classification becomes the authoritative mechanism for determining inclusion or exclusion from commercial analytics, reporting, exports, and future internal operations.

---

## Architectural principle

| Dimension | Field | Determines |
|-----------|-------|------------|
| **Authorization** | `role` (`user` \| `admin`) | Access, permissions, actions, admin capability |
| **Analytics classification** | `accountClassification` (`COMMERCIAL` \| `INTERNAL` \| `SYSTEM`) | Commercial inclusion, reporting population, KPI participation |
| **Commercial state** | Subscription + CRS | Entitlements, plan, MRR eligibility for **commercial** accounts |

These three concepts must remain independent.

```text
role                  → Can you access /admin?
accountClassification → Are you counted in MRR/subscribers?
subscription + CRS    → What plan/status does a COMMERCIAL account have?
```

---

## Phase B — Classification contract

### Canonical type (proposed)

```ts
export const ACCOUNT_CLASSIFICATIONS = [
  "COMMERCIAL",
  "INTERNAL",
  "SYSTEM",
] as const;

export type AccountClassification = (typeof ACCOUNT_CLASSIFICATIONS)[number];
```

**Persistence (ADMIN-AUTH-1B):** `users.accountClassification` column, `NOT NULL`, default `COMMERCIAL`.

### COMMERCIAL

Customer-facing accounts.

**Includes:**

- Trial users
- Paying subscribers
- Grace-period subscribers
- Future commercial customers

**Participates in:**

- MRR, ARR (when `countsInMrr`)
- Subscriber counts
- Trials, churn, growth (when certified metrics exist)
- Commercial Overview, exports, analytics commercial sections
- Subscriber reports

### INTERNAL

MineuQR staff accounts.

**Examples:** Marketing, Sales, Support, Operations, internal admins.

**Excluded from:**

- MRR, ARR
- Subscriber counts
- Trials, churn, growth KPIs
- Commercial analytics population
- Subscriber export rows (or listed in separate internal appendix — TBD in 1B)

**May still have:**

- `role = admin` (dashboard access)
- `role = user` (limited internal tooling)
- Optional subscription row for dogfooding (does not affect commercial KPIs while `INTERNAL`)

### SYSTEM

Non-human platform accounts.

**Examples:** Service accounts, automation, integrations, background workers.

**Excluded from:** All commercial KPIs and all human-facing subscriber tables.

### Distinction from existing `AccountType`

| Field | Layer | Examples |
|-------|-------|----------|
| `accountClassification` | **Population** — in or out of commercial metrics | `INTERNAL` staff never in MRR denominator |
| `AccountType` (CRS) | **Entitlement** — trial/paying/admin plan within population | `PAYING`, `TRIAL` for a `COMMERCIAL` account |
| `CommercialPlan.ADMIN` | **Legacy bypass** tied to `role` | **Retire** as population mechanism in ADMIN-AUTH-1C |

---

## Phase C — Migration strategy (design only)

### Existing users

| Cohort | Default classification | Rationale |
|--------|------------------------|-----------|
| All current `role = user` accounts | `COMMERCIAL` | Customer-facing default; preserves today's KPI baselines |
| All current `role = admin` accounts | `INTERNAL` (recommended) | Platform operators should not inflate subscriber counts |
| Known automation / service openIds | `SYSTEM` (manual list) | Case-by-case in 1B migration script |

**No automatic execution in ADMIN-AUTH-1A.**

### Current admin account (`ENV.ownerOpenId`)

| Attribute | Recommended value |
|-----------|-------------------|
| `role` | `admin` (unchanged) |
| `accountClassification` | `INTERNAL` |

**Rationale:**

- Owner account exists for platform operations, not as a paying customer.
- Today it appears in Commercial Subscribers (ADMIN plan) per EXEC-7C.7 §6 — misrepresents customer count by +1.
- `INTERNAL` removes it from KPI population while preserving full admin access via `role`.

### Future internal staff

Must be created with `accountClassification = INTERNAL` at creation time.

**ADMIN-AUTH-1B requirements:**

- `admin.createInternalUser` (or equivalent) sets classification explicitly
- `updateUserRole` must **not** set classification
- Classification changes require separate audited procedure

### Rollout phases (planned)

| Phase | Scope |
|-------|-------|
| **1B** | Schema + backfill + internal user creation API |
| **1C** | Wire classification filter into CRS population boundary |
| **1D** | Remove `role === "admin"` → ADMIN plan commercial bypass |
| **1E** | Reconciliation tests: INTERNAL accounts never in snapshot KPIs |

---

## Phase D — Commercial analytics integration audit

Inventory of entry points where classification filters will eventually apply (**not implemented in 1A**).

### Population boundary (primary filter point)

| # | Service | Method | Filter action (planned) |
|---|---------|--------|-------------------------|
| 1 | `CommercialReadService` | `getAllOwnerCommercialStates` | Load users where `classification === COMMERCIAL` only |
| 2 | `CommercialReadService` | `getOwnerCommercialStates` | Reject or no-op non-COMMERCIAL ids for metrics callers |
| 3 | `CanonicalMetricsService` | `loadOwnerStates` | Inherits filtered list from CRS |

### Snapshot and reporting

| # | Service | Method | Filter action (planned) |
|---|---------|--------|-------------------------|
| 4 | `CanonicalMetricsService` | `getCommercialOverviewSnapshot` | All KPI sections use filtered states |
| 5 | `CommercialReportService` | `buildCommercialExportPackage` | Overview from filtered snapshot |
| 6 | `CommercialReportService` | `buildSubscriberReport` | Rows = COMMERCIAL owners only |
| 7 | `projectCommercialAnalytics` | `projectCommercialAnalytics` | Inherits filtered package |

### UI consumers (read-only — no local filtering)

| Surface | Endpoint | Notes |
|---------|----------|-------|
| Commercial Overview | `admin.getCommercialOverview` | Snapshot already filtered server-side |
| Analytics | `admin.getCommercialAnalytics` | Projection inherits package |
| CSV / Excel / PDF | `admin.exportCommercialReport` | Package inherits filter |
| Admin user management | `admin.listAllUsers` | Shows all users + classification badge (1B) |

### Operational metrics (separate from commercial population)

| # | Service | Method | Classification impact |
|---|---------|--------|----------------------|
| 8 | `resolveOperationalCounts` | `counts.totalUsers` | **All users** (platform registry) — unchanged |
| 9 | `resolveOperationalCounts` | `userGrowth` series | **All signups** — platform metric, not commercial |
| 10 | `resolveDashboardEntityCounts` | `totalUsers` | Platform count; document as non-commercial |

**Rule:** Classification filters apply to **commercial authority population**, not platform entity registries.

### Resolver decoupling (ADMIN-AUTH-1C)

| # | File | Change (planned) |
|---|------|------------------|
| 11 | `buildCommercialContextFromDb.ts` | Remove `role === "admin"` shortcut |
| 12 | `resolveCommercialEntitlements.ts` | Remove `role === "admin"` → ADMIN plan |
| 13 | `planFeatureMatrix.ts` | ADMIN plan participation reviewed — may become INTERNAL-only feature grant |

### Certified pipeline diagram (target)

```text
getAllUsers({ classification: "COMMERCIAL" })   ← new filter
        ↓
CommercialReadService.getAllOwnerCommercialStates()
        ↓
getCommercialOverviewSnapshot()
        ↓
CommercialReportService → CommercialExportPackage
        ↓
Commercial Overview | Analytics | CSV | Excel | PDF
```

---

## Phase E — RBAC separation audit

### Independence requirement

`role` and `accountClassification` are orthogonal.

| Valid | Description |
|-------|-------------|
| `role=user`, `classification=COMMERCIAL` | Standard customer |
| `role=user`, `classification=INTERNAL` | Staff without admin panel (e.g. support read-only — future) |
| `role=admin`, `classification=INTERNAL` | **Recommended** platform operator |
| `role=admin`, `classification=COMMERCIAL` | Allowed but discouraged — dogfooding admin who is also a customer |
| `role=user`, `classification=SYSTEM` | Service account with limited API scope (future) |
| `role=admin`, `classification=SYSTEM` | **Forbidden** — system accounts must not have human admin role |

### Invalid / deprecated patterns

| Pattern | Problem |
|---------|---------|
| `role=admin` → auto ADMIN commercial plan | Conflates authorization with KPI population |
| `role=admin` → exclude from MRR only | Still inflates subscriber counts |
| `updateUserRole` → changes classification | Couples permission change to analytics |

### Allowed combinations matrix

|  | COMMERCIAL | INTERNAL | SYSTEM |
|--|------------|----------|--------|
| **role=user** | ✅ Default customer | ✅ Internal staff | ✅ Service account |
| **role=admin** | ⚠️ Rare (dual-purpose) | ✅ **Recommended** for operators | ❌ Forbidden |

### What `role` continues to control (unchanged)

- `assertAdminAccess` / admin tRPC procedures
- Admin UI route gates (`useAuthGate`, `adminQueriesEnabled`)
- Email verification policy exemption
- Tenant vs admin audit logging

### What `accountClassification` will control (ADMIN-AUTH-1C+)

- Inclusion in `getAllOwnerCommercialStates` for metrics
- Subscriber report rows
- MRR / ARR / health / plan distribution denominators
- Commercial export commercial sections

---

## Implementation plan (ADMIN-AUTH-1B → 1E)

### ADMIN-AUTH-1B — Internal Staff Accounts

1. Add `users.accountClassification` column + Drizzle migration
2. Backfill: `user` → `COMMERCIAL`, `admin` → `INTERNAL` (configurable override list)
3. `admin.createInternalUser` with explicit `INTERNAL` classification
4. Expose classification in `listAllUsers` / admin UI (read-only badge)
5. Audit log on classification changes

### ADMIN-AUTH-1C — Commercial population filter

1. Add `getCommercialPopulationUsers()` helper
2. Filter `CommercialReadService.getAllOwnerCommercialStates`
3. Update reconciliation tests (EXEC-7C.2, ADMIN-UX-1E, ANALYTICS-ALIGNMENT-1)
4. Document KPI baseline shift (admin accounts removed from subscriber count)

### ADMIN-AUTH-1D — Decouple role from commercial bypass

1. Remove `role === "admin"` branches in `buildCommercialContextFromDb` / `resolveCommercialEntitlements`
2. INTERNAL accounts resolve to `NONE` or dedicated internal entitlements (unlimited features via separate internal grant if needed)
3. Retire `CommercialPlan.ADMIN` as role-derived plan (keep enum for migration compatibility or rename)

### ADMIN-AUTH-1E — Certification

1. Parity tests: INTERNAL/SYSTEM never appear in snapshot KPIs
2. Update EXEC-7C.7 metric definitions §8 Internal Accounts
3. Operator runbook for creating internal staff

---

## Deliverables checklist

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Account Model Audit | `ADMIN-AUTH-1A-ACCOUNT-MODEL-AUDIT.md` | ✅ |
| 2 | Classification Contract | This document § Phase B | ✅ |
| 3 | Migration Strategy | This document § Phase C | ✅ |
| 4 | Commercial Integration Audit | This document § Phase D | ✅ |
| 5 | RBAC Separation Audit | This document § Phase E | ✅ |
| 6 | Implementation Plan | This document § Implementation plan | ✅ |

---

## Exit criteria

| Criterion | Status |
|-----------|--------|
| Account classification model formally defined | ✅ |
| COMMERCIAL / INTERNAL / SYSTEM definitions approved | ✅ |
| Migration strategy documented | ✅ |
| Commercial integration points identified | ✅ |
| Role and classification responsibilities separated | ✅ |
| No production behavior changes | ✅ |

**Output:** Certified foundation for **ADMIN-AUTH-1B Internal Staff Accounts**.
