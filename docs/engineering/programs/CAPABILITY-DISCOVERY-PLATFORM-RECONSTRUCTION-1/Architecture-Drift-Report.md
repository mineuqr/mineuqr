# Architecture Drift Report

**Program:** CAPABILITY-DISCOVERY-PLATFORM-RECONSTRUCTION-1  
**Baseline:** Production architecture + COMMERCIAL-CAPABILITY-REGISTRY-FORENSICS-1 + PLATFORM-CAPABILITY-DISCOVERY-1

---

## 1. Drift classes observed

### D1 — Commercial SSOT ≠ Platform SSOT

| Evidence | Effect |
|----------|--------|
| Filter Registry = 18 FEATURE_KEYS | Plans cannot express Kitchen/Print/CRMP/… |
| Forensics: 1/18 forensic READY | Commercial language overstates sellability |
| Discovery ELIGIBLE = 17 | Platform has sellable surface Commercial Registry ignores |

**Root cause:** Legacy packaging list maintained independently of Discovery.

---

### D2 — Prior Discovery included non-platform entries

| Prior ID | Issue | Reconstruction action |
|----------|-------|----------------------|
| CAP-45 AI | Planned; no runtime | **Excluded** |
| CAP-38 Performance | Experimental | **Excluded** |
| CAP-39 Ops Runtime Platform | Experimental | **Excluded** |
| CAP-44 Architecture Governance | Process/docs | **Excluded** |
| CAP-14 Financial Core Language | Constitution language | **Excluded** (embodied in CAP-08–13) |
| CAP-18 Custody Plane | Governance-only | **Excluded** |

---

### D3 — Prior Discovery under-classified production

| ID | Prior status | Evidence now | Reconstruction |
|----|--------------|--------------|----------------|
| CAP-29 Devices | Development | Full management/runtime/fleet + UI | **Production** |
| CAP-33 Counter Pickup | Development | Staff settle APIs + Orders workspace | **Production** |
| Expo | Subsumed under Kitchen/Screen | Dedicated role + Ready ownership | **CAP-47 first-class** |
| Tax Policy | Buried in Menu/Check | Settings + Check snapshot | **CAP-48 first-class** |

---

### D4 — Screen role registry ahead of product UI

| Role | Drift |
|------|-------|
| `customer_display` | Registered; blocked UI — **not** a capability |
| `pickup_display` | Same |
| `print_monitor` | Panel exists; not mounted — **not** a capability |

Treating role enums as capabilities caused false “Customer Display” inventory historically.

---

### D5 — Hotel marketing vs architecture

| Claim | Reality |
|-------|---------|
| Hotel Platform | **No** `server/hotel*` |
| `hotelMode` / `roomQr` FEATURE_KEYS | `tableLabel` + table QR packaging |
| Reconstruction | Not a Discovery capability; legacy **Deprecated** |

---

### D6 — Analytics naming collision

| Surface | Owner | Router |
|---------|-------|--------|
| Restaurant Reporting | CAP-22 | `reporting.*` |
| SaaS Analytics | CAP-43 | `analytics.*` |

Drift risk: conflating in Commercial packaging. Reconstruction keeps both; only CAP-22 ELIGIBLE for merchant Plans.

---

### D7 — Enforcement adoption lag

| Fact | Drift |
|------|-------|
| CAP-20 matrix maps many keys | Domains mostly ignore `hasFeature` |
| Only guest `ordering` full enforce | Eligibility ≠ currently enforced |

Commercial Projection must include an **enforcement readiness** overlay before GA toggles.

---

## 2. Architecture violations / leaks

| ID | Finding | Verdict |
|----|---------|---------|
| V1 | CAP-33 settle under Order + channel semantics | Documented primary owner (Order) — accepted |
| V2 | CAP-35 bags restaurant ops + platform admin | Soft boundary blur — optional future split |
| V3 | FEATURE_KEYS claim ownership of Menu facets | **Violation of Discovery authority** (commercial side) |
| V4 | Check money vs Register custody | Constitutional separation held (not violation) |

---

## 3. Why Registry and Platform differ (confirmed)

1. Legacy FEATURE_KEYS inheritance (PG-1C / I-SRE-02)  
2. Discovery completed as parallel catalog, then annotated onto keys  
3. Platform domains grew (Kitchen, Print, CRMP, Devices, Expo) without filter expansion  
4. Adoption programs explicitly forbade Runtime/Registry redesign  
5. Role registries and Planned CAP entries inflated “coverage” without production UI  

---

## 4. Drift closure path (out of scope)

Ratify Canonical Discovery → implement Commercial Projection → retire FEATURE_KEYS vocabulary.  
**Not started in this program.**
