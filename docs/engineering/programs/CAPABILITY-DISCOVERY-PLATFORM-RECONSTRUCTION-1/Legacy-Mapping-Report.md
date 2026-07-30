# Legacy Mapping Report

**Program:** CAPABILITY-DISCOVERY-PLATFORM-RECONSTRUCTION-1  
**Scope:** Documentation only — **no automatic migration**.  
**Sources:** `COMMERCIAL_CAPABILITY_FILTER_KEYS` / `FEATURE_KEYS` ↔ Canonical Discovery IDs.

### Classification vocabulary

| Class | Meaning |
|-------|---------|
| **Direct Mapping** | One legacy key ≈ one Discovery capability (or clear primary) |
| **Split** | One legacy key spans multiple Discovery capabilities |
| **Merged** | Multiple legacy keys collapse into one Discovery capability |
| **Deprecated** | Legacy key must not become a Discovery capability; packaging obsolete |
| **Removed** | No Discovery counterpart; drop from future Commercial projection |

---

## FEATURE_KEYS → Discovery

| Legacy FEATURE_KEY | Discovery ID(s) | Classification | Rationale |
|--------------------|-----------------|----------------|-----------|
| `qrMenu` | CAP-05 (+ CAP-06 for QR table link) | **Split** | Public menu is CAP-05; QR/table association CAP-06 — not a separate product |
| `categories` | CAP-05 | **Merged** | Catalog facet of CAP-05 |
| `menuImages` | CAP-05 + CAP-41 | **Split** | Catalog + storage infra |
| `search` | CAP-05 | **Merged** / **Deprecated** as toggle | Ungated menu UX; not a capability boundary |
| `ordering` | **CAP-03** (primary); uses CAP-01 | **Direct Mapping** | Closest true sellable channel platform |
| `cart` | CAP-04 | **Deprecated** as toggle | Presentation step of Ordering Client |
| `checkout` | CAP-04 | **Deprecated** as toggle | Same |
| `requestBill` | CAP-08 | **Direct Mapping** (weak) | Settlement/check surface; no dedicated enforcement historically |
| `callWaiter` | CAP-31 | **Direct Mapping** (weak) | Waiter product; key never hard-enforced |
| `orderTracking` | CAP-02 + CAP-34 | **Split** | Public status + optional push |
| `reports` | **CAP-22** | **Direct Mapping** | |
| `excelExport` | CAP-22 | **Merged** | Export facet of Reporting |
| `hotelMode` | CAP-05/06 `tableLabel` | **Deprecated** | Not a Hotel platform; labeling facet |
| `roomQr` | CAP-06 | **Deprecated** as distinct product | Table QR packaging |
| `dynamicServiceCatalog` | CAP-05 (offers) | **Merged** / **Deprecated** as toggle | Offers module of Menu |
| `templates` | CAP-05 | **Merged** | Branding facet |
| `customColors` | CAP-05 | **Merged** | Branding facet |
| `customFonts` | CAP-05 | **Merged** | Branding facet |

---

## Limit keys → Discovery (informational)

| Legacy Limit Key | Discovery touch | Classification |
|------------------|-----------------|----------------|
| `restaurants` | CAP-24 / CAP-05 | Quota on tenant graph |
| `items` / `categories` | CAP-05 | Catalog quotas |
| `ordersPerMonth` | CAP-01 | Order volume quota |
| `qrCodes` | CAP-06 | Table/QR quota |
| `storage` / `images` | CAP-41 | Storage quotas |
| `staffAccounts` | CAP-25 | Identity quota |
| `branches` | CAP-24 | Tenant graph |
| `devices` | CAP-29 | Device quota |

Limits are **not** Discovery capabilities; they are Commercial Projection quota dimensions.

---

## Discovery ELIGIBLE capabilities with **no** legacy FEATURE_KEY

| Discovery ID | Name | Legacy status |
|--------------|------|---------------|
| CAP-08 | Check | **Removed** from legacy vocabulary (never a filter key) |
| CAP-10 | Split Payment | **Removed** |
| CAP-11 | Multi-Check Allocation | **Removed** |
| CAP-13 | Refund | **Removed** |
| CAP-16 | CRMP | **Removed** |
| CAP-17 | Financial Shift | **Removed** |
| CAP-26 | Kitchen | **Removed** |
| CAP-27 | Printing | **Removed** |
| CAP-28 | Realtime | **Removed** |
| CAP-29 | Devices | Partial via limit `devices` only |
| CAP-30 | Screens | **Removed** |
| CAP-31 | Waiter | Weak `callWaiter` only |
| CAP-32 | Kiosk | Covered coarsely by `ordering` |
| CAP-33 | Counter Pickup | **Removed** |
| CAP-47 | Expo | **Removed** |

---

## Migration posture

| Action | Status |
|--------|--------|
| Auto-migrate FEATURE_KEYS → CAP IDs | **Forbidden** in this program |
| Keep FEATURE_KEYS live in Runtime | Unchanged (STOP) |
| Future Commercial Projection | Must emit Plan filters from Discovery ELIGIBLE set, not from this legacy table |

---

## Summary counts

| Classification | Count (feature keys) |
|----------------|---------------------:|
| Direct Mapping | 4 (`ordering`, `requestBill`, `callWaiter`, `reports`) |
| Split | 3 |
| Merged | 7 |
| Deprecated | 6+ (including branding/hotel/search facets) |
| Removed (Discovery-only ELIGIBLE) | 15 capabilities never in FEATURE_KEYS |
