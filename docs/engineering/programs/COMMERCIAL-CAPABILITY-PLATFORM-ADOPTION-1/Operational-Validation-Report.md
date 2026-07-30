# Operational Validation Report — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1 |
| **Mode** | Operational Validation (implementation complete — no redesign) |
| **Date** | 2026-07-30 |
| **Suite** | `server/commercial-catalog/__tests__/commercialCapabilityOperationalValidation.test.ts` |
| **Result** | **8/8 PASS** (within combined regression run **30/30**) |
| **Constraints** | No architecture change · No commit · No push · No deploy |

---

## Executive result

End-to-end commercial capability lifecycle validated against the implemented platform:

Registry → Plan (filters) → Approve → Publish → Public Pricing projection → Retire/Archive → Runtime entitlements from Snapshot.

| Scenario | Result |
|----------|--------|
| 1. Capability Registry | **PASS** |
| 2. Commercial Plan + unknown key reject | **PASS** |
| 3. Approval — draft/approved not public | **PASS** |
| 4. Publish → Published Offering | **PASS** |
| 5. Pricing projection (monthly/yearly/caps/metadata) | **PASS** |
| 6. Retire — removed from pricing; Snapshot intact | **PASS** |
| 7. Archive — inaccessible; Snapshot intact | **PASS** |
| 8. Runtime enabled/disabled + vocabulary match | **PASS** |
| 9. Runtime enforcement surfaces | **PASS** (with documented Device/Screen residual) |
| 10. Regression boundaries | **PASS** |

---

## Scenario evidence (automated)

### 1. Capability Registry
- 18 unique filter keys; registry length 18; `FEATURE_KEYS` ≡ filter keys.
- 46 Discovery classifications present.
- Unknown key assert fails closed.

### 2. Commercial Plan
- Bundle created with all registry keys; only `ordering` + `reports` included.
- `notInRegistry` feature key → `CommercialCatalogError`.
- Unknown limit key → `CommercialCatalogError`.

### 3. Approval
- `approveVersion` → workflow `approved`.
- Public offerings length 0; get-by-id throws not publicly accessible.

### 4–5. Publish / Pricing projection
After workflow publish:
- Exactly one public offering.
- `priceMonthly=19.00`, `priceYearly=190.00`, currency USD.
- `featureKeys=["ordering","reports"]`.
- Plan name + version metadata present.
- `workflowState=published`, browsable + open for adoption.

### 6–7. Retire / Archive
- Deprecate → browse empty; historical get OK.
- Retire → public inaccessible; **captured Snapshot unchanged**.
- Archive → workflow `archived`; public inaccessible; Snapshot unchanged (**I-CPL-13**).

### 8. Subscription Runtime
- Snapshot from published professional plan + active lifecycle.
- `features.ordering/reports=true`; other registry keys `false`.
- Feature object keys === `FEATURE_KEYS`.
- Plan resolves `PROFESSIONAL`.

### 9–10
See Runtime Enforcement Report and Regression Report.

---

## UI validation status

| Area | Method | Status |
|------|--------|--------|
| Plan Builder / Editor wiring to registry | Source + prior adoption guards | **PASS** |
| Pricing = Public Offerings only | Source + E2E projection | **PASS** |
| Live browser screenshots | Not available in this validation environment (no browser automation MCP) | **DEFERRED to AA certification environment** |

Any live visual discrepancy found during AA cert must block Production Certification until reconciled. Automated projection behavior matches required Pricing outcomes.

---

## Invariants

| ID | Operational result |
|----|--------------------|
| I-CPL-13 | Snapshot preserved across retire/archive |
| I-SRE-01 | Entitlements from Runtime resolver + Snapshot |
| I-SRE-02 | Vocabulary aligned with filter registry |
| I-CPP-01 | Public projection never authorizes |

---

## STOP

Await Architecture Authority **Production Certification**.
