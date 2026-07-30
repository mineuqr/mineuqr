# Capability Coverage Report — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

## Method

Audited Plan Builder, Plan Editor, Published Pricing, Commercial Catalog, Subscription Runtime, Navigation gates, Admin UI, Customer UI against PLATFORM-CAPABILITY-DISCOVERY-1 and the Commercial Capability Filter Registry.

---

## A. Commercial filter vocabulary (18) — full coverage

| Filter Key | In Discovery | Production | Runtime Enforced | Commercializable | Hardcoded duplicate removed | Orphan |
|------------|--------------|------------|------------------|------------------|-----------------------------|--------|
| qrMenu | CAP-05,06 | Yes | flags_only | Yes | Yes → registry | No |
| categories | CAP-05 | Yes | flags_only | Yes | Yes → registry | No |
| menuImages | CAP-05,41 | Yes | flags_only | Yes | Yes → registry | No |
| search | CAP-05 | Yes | flags_only | Yes | Yes → registry | No |
| ordering | CAP-03,01,32 | Yes | **full** | Yes | Yes → registry | No |
| cart | CAP-04,03 | Yes | flags_only | Yes | Yes → registry | No |
| checkout | CAP-04,03 | Yes | flags_only | Yes | Yes → registry | No |
| requestBill | CAP-08,31 | Yes | flags_only | Yes | Yes → registry | No |
| callWaiter | CAP-31 | Yes | flags_only | Yes | Yes → registry | No |
| orderTracking | CAP-02,34 | Yes | flags_only | Yes | Yes → registry | No |
| reports | CAP-22 | Yes | flags_only | Yes | Yes → registry | No |
| excelExport | CAP-22 | Yes | flags_only | Yes | Yes → registry | No |
| hotelMode | CAP-05 | Yes | flags_only | Yes | Yes → registry | No |
| roomQr | CAP-06 | Yes | flags_only | Yes | Yes → registry | No |
| dynamicServiceCatalog | CAP-05 | Yes | flags_only | Yes | Yes → registry | No |
| templates | CAP-05 | Yes | coarse_legacy | Yes | Yes → registry | No |
| customColors | CAP-05 | Yes | coarse_legacy | Yes | Yes → registry | No |
| customFonts | CAP-05 | Yes | coarse_legacy | Yes | Yes → registry | No |

All 18 map 1:1 to I-SRE-02 feature entitlements and Runtime `FEATURE_KEYS`.

---

## B. Surface audit summary

| Surface | Capability source (after adoption) |
|---------|-------------------------------------|
| Plan Builder / Wizard | Filter Registry via `CATALOG_FEATURE_KEYS` |
| Plan Editor / Feature Bundles | Same + server rejects unknown keys |
| Published Pricing | Published Offering `featureKeys` only |
| Commercial Catalog store | Filter keys only (validated on write) |
| Subscription Runtime | Snapshot ∩ FEATURE_KEYS (= Filter SSOT) |
| Navigation / UI gates | Runtime entitlements via `commercial.getEntitlements` |
| Admin / Customer commercial UI | Runtime display; no local matrices for authz |

---

## C. Discovery commercializable not yet in filter vocabulary

See [Remaining-Gap-Report.md](./Remaining-Gap-Report.md) — intentional backlog (no silent sellable orphans in filter set).

---

## D. Duplicate / orphan status (commercial filter plane)

| Issue | Status |
|-------|--------|
| 4× duplicated 18-key arrays | **Resolved** — single registry |
| Orphan filter keys (not in Runtime) | **None** |
| Unsupported inventable feature keys in Catalog UI | **Blocked** by assert |
| Pricing manual feature lists | **Removed** (prior platform adoption; reconfirmed) |
