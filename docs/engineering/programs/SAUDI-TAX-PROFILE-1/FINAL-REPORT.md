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
