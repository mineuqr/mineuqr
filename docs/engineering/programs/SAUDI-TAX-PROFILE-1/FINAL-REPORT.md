# SAUDI-TAX-PROFILE-1 — Final Report

## Verdict: **PASS**

## SHAs

| Field | Value |
|-------|-------|
| Starting SHA | `321127c1d75db02d3f788edeffcc4f4327773a76` |
| Ending SHA | `59b252043c40bfba6b7b9f95907c4fa748c0658d` |
| Commit SHA | `2449234012dc6d4619384f36eae205f3d6594f4f` (implementation) |
| Docs SHA | `59b252043c40bfba6b7b9f95907c4fa748c0658d` |
| Commit message | `feat(tax): establish Saudi tax profile foundation` |
| `git diff --check` | **PASS** |
| Push result | **SUCCESS** (`321127c1..59b25204`) |
| HEAD == origin/main | **YES** |
| Working tree | **clean** |

## Tax Profile architecture

```
restaurants.countryCode = SA
        ↓
Saudi/ZATCA module applicable
        ↓
saudi_tax_profiles (tenant-scoped)
        ↓
readiness: NOT_CONFIGURED | INCOMPLETE | READY
```

Country-specific table in Compliance Layer — not Global Core `restaurants` columns.

## Fields implemented

| Field | Classification |
|-------|----------------|
| `legalName` | **IMPLEMENTED / REQUIRED** |
| `vatRegistrationStatus` (`unknown` \| `not_registered` \| `registered`) | **IMPLEMENTED / REQUIRED** |
| `vatNumber` | **IMPLEMENTED / REQUIRED when registered** |
| `registeredAddress` | **IMPLEMENTED / REQUIRED when registered** |
| `countryCode` stamp (`SA`) | **IMPLEMENTED** |
| Structured address lines | **DEFERRED** |
| Commercial Registration (CR) | **NEEDS OFFICIAL CONFIRMATION** |
| Branch identity | **DEFERRED** |
| Currency on profile | **DEFERRED** (use restaurant currency; snapshot later) |
| VAT checksum / ZATCA remote validation | **DEFERRED** |

## Readiness behavior

- SA alone → applicable, not READY
- `unknown` → INCOMPLETE
- `not_registered` + legal name → READY
- `registered` + legal name + structurally valid VAT + address → READY

## API / service boundaries

| Endpoint | Auth |
|----------|------|
| `saudiTaxProfile.get` | `verifiedProcedure` + `assertRestaurantAccess` |
| `saudiTaxProfile.upsert` | same; rejects non-SA country |

Audit: `emitAuditEvent` on upsert (`saudi_tax_profile.upsert`).

## UI boundaries

Admin Settings (`SaudiTaxProfileSection`) when country is SA. Not Cashier. Not Tax Invoice screens.

## Authorization / tenancy

Owner/admin via existing `assertRestaurantAccess`. Unique `restaurantId`. Server-authoritative country.

## Regression guards

Saudi Tax Profile architecture guards + existing multi-country compliance guards.

## Test / check results

| Check | Result |
|-------|--------|
| Compliance + Tax Profile tests | **42 / 42 PASS** |
| Financial / Cashier regression | **30 / 30 PASS** |
| `pnpm run check` | **PASS** |
| `git diff --check` | *(at commit)* |

## Official ZATCA sources used

- https://zatca.gov.sa/en/E-Invoicing/PreparingYourBusiness/Phase1/Pages/How-to-prepare.aspx
- ZATCA E-invoicing Simplified Guideline (seller name / VAT / address examples)
- ZATCA Electronic Invoice XML Implementation Standard (invoice field requirements — not implemented)

## IMPLEMENTED

- `saudi_tax_profiles` table + migration `0104`
- Shared readiness + VAT structural validation
- Service + tRPC router
- Admin Settings UI
- Architecture guards
- Audit on upsert
- `profileRequired` for SA module

## DEFERRED

- Tax Invoice / IRN / QR / Credit Notes
- Customer Management
- ZATCA/Fatoora / Phase 2
- Structured address / CR / branch
- Country-change migration workflow
- `onRefundCommitted` wiring
- Commercial plan gating of Tax Profile

## NEEDS OFFICIAL CONFIRMATION

- Whether Commercial Registration (CR) is required on Tax Profile vs invoice-time only
- Authoritative VAT number checksum algorithm for local validation

## Push / HEAD

| Field | Value |
|-------|-------|
| Push | `git push origin main` |
| Commit | `2449234012dc6d4619384f36eae205f3d6594f4f` |

---

## Migration governance closeout (0104 terminus)

### Incident

Production Vercel build reached journal terminus `0104_saudi_tax_profiles` (105 entries) but failed the migration governance guard, which still expected certified terminus `0103_realtime_bus_messages` (104 entries).

### Root cause

Stale static certified baseline in `scripts/lib/migration-governance-lib.cjs`:

- `CANONICAL_MIGRATION_TAIL_TAG = "0103_realtime_bus_messages"`
- `CANONICAL_JOURNAL_ENTRY_COUNT = 104`

Migration **0104 itself was not defective**. The guard had not been adopted after SAUDI-TAX-PROFILE-1 journalized 0104.

### Correction

| Artifact | Change |
|----------|--------|
| `scripts/lib/migration-governance-lib.cjs` | Terminus → `0104_saudi_tax_profiles`, count → **105** |
| `scripts/migration-governance-guard.cjs` | Messages updated to `0000–0104` |
| `scripts/__tests__/migrationGovernance.test.ts` | Protects 0103 retention + 0104 terminus; anti-regress to 0103 |
| `settlementRecordMigration.architecture.guards.test.ts` | Align with “terminus may advance” pattern (same as 0074/0075) |

Governance protections retained: ordering, orphans, missing files, legacy orphan handling, deploy exit 1.

### Production migration state

| Check | Result |
|-------|--------|
| Preflight before apply | Pending: `0104_saudi_tax_profiles` |
| Apply | `pnpm db:migrate` — **SUCCESS** |
| Preflight after apply | All journal hashes recorded in DB |
| `saudi_tax_profiles` table | **PRESENT** (columns match implementation) |
| `__drizzle_migrations` hash for 0104 | **1 row** |
| Final repository terminus | `0104_saudi_tax_profiles` |

### Governance verification

| Check | Result |
|-------|--------|
| `pnpm run db:governance-check` | **PASS** — Last journal tag `0104_saudi_tax_profiles` |
| Migration governance tests | **26 / 26 PASS** |
| `pnpm run check` | **PASS** |
| Relevant compliance/governance tests | **PASS** |

### Governance closeout SHAs

| Field | Value |
|-------|-------|
| Governance fix commit | `f64afd2a617ff28dadc6b79240d1404e81d49156` |
| Docs closeout commit | `d224c90f46b67910f593490813459c90ecaa3220` |
| Message | `fix(db): align migration governance with 0104` |
| Push | **SUCCESS** (`79a62604..d224c90f`) |
| HEAD == origin/main | **YES** (`d224c90f`) |
| Working tree | **clean** |
| Migration Governance CI | **success** |
| Vercel Production | **success** (sha `d224c90`, deployment `6185185391`) |
| Final migration terminus | `0104_saudi_tax_profiles` |

---

## Schema/query contract repair (Production GET failure)

### Observed failure

Admin Settings / `saudiTaxProfile.get` failed with a query selecting nonexistent column:

`saudi_vat_registration_status`

from `"saudi_tax_profiles"`.

### Root cause (evidence-based)

| Contract | Evidence |
|----------|----------|
| Migration 0104 | Creates `` `vatRegistrationStatus` enum(...) `` — **not** `saudi_vat_registration_status` |
| Production DB | `SHOW COLUMNS`: physical column **`vatRegistrationStatus`**; `saudi_vat_registration_status` **absent** (count 0) |
| Application schema | `drizzle/schema.ts` mapped `vatRegistrationStatus: mysqlEnum("saudi_vat_registration_status", …)` |
| Query | Drizzle SELECT emitted `"saudi_vat_registration_status"` → TiDB unknown column → GET crash |
| Git history | Drift introduced in same commit as foundation (`24492340`); migration SQL was correct from day one |

**Single root cause:** Drizzle property→column mapping used a wrong physical name. Production schema and migration 0104 were correct. **No new migration required.**

### Repair

| Change | Detail |
|--------|--------|
| `drizzle/schema.ts` | `mysqlEnum("vatRegistrationStatus", …)` — match 0104 / Production |
| Architecture guards | Assert migration ↔ Drizzle physical name; runtime `getTableColumns` name check |
| Migration | **NONE** — 0104 preserved; terminus remains `0105_customers` |

### Production verification (pre-deploy DB + post-deploy app)

| Check | Result |
|-------|--------|
| Production host | `gateway01…/mineuqr` |
| Column `vatRegistrationStatus` | **PRESENT** |
| Column `saudi_vat_registration_status` | **ABSENT** |
| Drizzle `getTableColumns(…).name` after fix | `vatRegistrationStatus` |
| Live Drizzle `.select().from(saudiTaxProfiles)` against Production | **SUCCESS** (empty rows OK) |
| New migration | **Not required / not created** |
| `pnpm run check` | **PASS** |
| `pnpm run db:governance-check` | **PASS** — terminus `0105_customers` |
| Focused Saudi + compliance tests | **PASS** |
| Customer / CF / Cashier / governance regressions | **PASS** |

### Repair SHAs

| Field | Value |
|-------|-------|
| Commit | `fcd1b0f6cf8d6ed4ab27ecdb7350e9ce00ec4a1c` |
| Message | `fix(tax): repair Saudi tax profile schema contract` |
| HEAD == origin/main | **YES** (`fcd1b0f6`) |
| Working tree | **clean** (at push) |
| Vercel | **success** — “Deployment has completed” on `fcd1b0f6` |
| New migration | **NONE** |
