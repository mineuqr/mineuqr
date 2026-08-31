# BASELINE

**Program:** SAUDI-TAX-PROFILE-1  
**Measured:** 2026-08-31  
**Starting SHA:** `321127c1d75db02d3f788edeffcc4f4327773a76`

## Scope

Saudi Tax Profile foundation only — restaurant/business seller tax configuration for future Saudi Phase 1 programs.

**Out of scope:** Customer Management, Tax Invoice, IRN, QR, VAT engine changes, Credit Notes, ZATCA/Fatoora integration, Phase 2, Cashier changes, Realtime changes.

## Saudi module applicability

> **countryCode = SA determines that the Saudi/ZATCA compliance module is applicable. It does not by itself indicate that the restaurant's Tax Profile is complete or that the restaurant is ready to issue compliant Saudi tax invoices.**

```
countryCode = SA
        ↓
Saudi/ZATCA module applicable (Compliance Layer)
        ↓
Tax Profile complete?
        ↓
YES → READY
NO  → NOT_CONFIGURED / INCOMPLETE
```

## Tax Profile responsibility

Store seller identity required by future Phase 1 invoice generation:

- Legal/business name
- VAT registration status
- VAT registration number (when registered)
- Registered business address (when registered)

## Field classification

| Field | Class | Basis |
|-------|-------|-------|
| `legalName` | **REQUIRED** | Official Phase 1: seller name on Tax Invoice / Simplified Tax Invoice |
| `vatRegistrationStatus` | **REQUIRED** | Architecture: SA ≠ VAT registered |
| `vatNumber` | **REQUIRED when registered** | Official Phase 1: seller VAT registration number |
| `registeredAddress` | **REQUIRED when registered** | Official Phase 1: seller address |
| Structured address lines (building, street, district, postal) | **DEFERRED** | Useful for XML later; free-text address sufficient for profile foundation |
| Commercial Registration (CR) / Other Seller ID | **NEEDS OFFICIAL CONFIRMATION** | Appears in examples; Phase 1 profile necessity vs invoice-time only unclear |
| Branch / multi-location tax identity | **DEFERRED** | Not required for single-restaurant profile foundation |
| Currency | **DEFERRED** | Use existing `restaurants.currencyCode`; snapshot at future Tax Invoice time |
| Country on profile row | **REQUIRED stamp** | Immutable `countryCode = SA` on profile; jurisdiction authority remains `restaurants.countryCode` |

## Readiness model

| State | Meaning |
|-------|---------|
| `NOT_CONFIGURED` | No profile row |
| `INCOMPLETE` | Profile exists but missing required fields for status |
| `READY` | Configuration complete for chosen VAT status |

`READY` ≠ Tax Invoice can be issued (invoice program deferred).  
`READY` ≠ ZATCA integrated.

## Ownership

Reuse `assertRestaurantAccess` — restaurant owner or platform admin. Cashier POS grants do not authorize Tax Profile mutation.

## Tenant boundary

`saudi_tax_profiles.restaurantId` unique. Server resolves country from authoritative restaurant row. Client countryCode not trusted for mutations.

## Global Core boundary

No `saudiVatNumber` / `saudiZatcaEnabled` on `restaurants`. No Saudi Tax Profile imports in Cashier, Collection Fact, Payment Confirm, or Customer.

## Future Tax Invoice dependency

Future programs must **snapshot** seller fields from the Tax Profile at artifact creation. Profile edits must not rewrite historical invoices.

## Phase 1 / Phase 2 boundary

This program implements neither invoice generation (Phase 1 artifacts) nor Fatoora integration (Phase 2).

## Country-change behavior

If `restaurants.countryCode` changes SA → AE (or reverse):

- Saudi Tax Profile row is **not** auto-converted to another country profile.
- Non-SA restaurants cannot get/upsert Saudi Tax Profile (API rejects).
- Orphan SA profile after country change remains inaccessible until country returns to SA or a future migration program deletes/archives it.
- Cross-country migration workflow: **DEFERRED**.

## Commercial-plan separation

Country determines jurisdiction. Plan entitlement does **not** gate Tax Profile domain in this program.

## Address strategy

Own tax-address text on the profile (option B/C hybrid: profile-owned free-text). Does not mutate/replace `restaurants.address`. Future invoices should snapshot profile address.

## Official sources (Phase 1)

- ZATCA: [How to Prepare (Phase 1)](https://zatca.gov.sa/en/E-Invoicing/PreparingYourBusiness/Phase1/Pages/How-to-prepare.aspx)
- ZATCA: E-invoicing Simplified Guideline (seller name, VAT number, address examples)
- ZATCA Electronic Invoice XML Implementation Standard (seller VAT / official address requirements for invoices — not implemented here)

## VAT number validation

Structural only: 15 digits starting with `3` (aligned with public ZATCA examples).  
Checksum / remote ZATCA verification: **DEFERRED** / **NEEDS OFFICIAL CONFIRMATION** for exact algorithm authority.
