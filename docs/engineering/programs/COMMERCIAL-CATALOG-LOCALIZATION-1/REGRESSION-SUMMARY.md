# Regression Summary

**Program:** COMMERCIAL-CATALOG-LOCALIZATION-1  
**Date:** 2026-07-29  
**Scope:** Architecture Authority — no runtime mutation in this program

---

## Preserved

| Asset | Status |
|-------|--------|
| Commercial Catalog as sole commercial SSOT | Preserved |
| CC-01…CC-16 governance | Preserved |
| Plan Identity → Version → Pricing model | Preserved |
| Snapshot integrity (CC-13) | Preserved; USD amount + region context clarified |
| Regional policies ownership (CC-15) | Preserved; role clarified as override/eligibility, not USD replacement |
| Publication gate (CC-16) | Preserved |
| Management UI + Admin Experience hosts | Preserved as presentation hosts |
| No payment / subscription entitlement edits in this program | Preserved |

---

## Policy amendment (non-regressive intent)

| Prior | Amendment |
|-------|-----------|
| Free-form multi-currency stored prices (PRC-04 additive currencies as commercial rows) | **Stored commercial amount = USD only**; local via override or FX presentation |
| Seed/UI default SAR as editable currency | Target default **USD**; SAR as SA override or FX display |

Amendment is **architecture-normative**. Applying it in runtime requires a controlled migration of existing non-USD price rows → USD canonical + optional overrides — **out of scope** for this architecture package (no schema execution / deploy here).

---

## Prohibited (still)

- Duplicated commercial catalogs  
- Country-specific commercial databases  
- Modifying canonical USD via localization  
- Language-based country detection  
- Hardcoded currencies / translations in Catalog UI  
- Duplicated pricing resolution logic across surfaces  

---

## Residual risk (for implementation program)

| Risk | Mitigation |
|------|------------|
| Existing SAR seed/adoption data | Migration plan: convert to USD + SA override |
| Legacy `/pricing` parallel consumer | Route display through Catalog dual-price resolver |
| Admin LTR shell vs Arabic operators | String localization first; shell RTL policy explicit |
| FX outage | usd_fallback + always show USD slot |
| Snapshot historical non-USD rows | Freeze historical snapshots; new binds USD-canonical |
