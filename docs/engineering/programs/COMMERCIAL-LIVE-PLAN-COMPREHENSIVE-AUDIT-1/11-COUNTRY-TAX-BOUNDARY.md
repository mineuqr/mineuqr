# 11 — COUNTRY / TAX BOUNDARY

## Expected

Live Plan = commercial offer.  
Tax Policy = tax calculation.  
Country Compliance = legal / invoice / e-invoicing.

## Actual

- `commercial_regions`: Production row `sa` / country `SA` / currency `SAR` / `taxPolicyRef` **present**.
- That ref is **not read** by checkout, Charged Terms bind, or MRR.
- Subscription checkout does **not** apply VAT to Offer List Price.
- Restaurant/check `taxPolicyJson` / settlement tax is a **separate operational-session domain**.
- FX (`shared/commercial-catalog/localization/fx.ts`) is **presentation** (Pricing dual-price), not a charge engine.
- Invoices: PDF currency hardcoded USD from Charged Terms; not country e-invoicing.

## Verdict

Live Plan does **not** own country-specific legal tax behavior in runtime. Regional catalog rows and `taxPolicyRef` are **unused at charge time**. No Country Compliance implementation was started (honored).

Classification: tax on Live Plan/region = **E. Operational metadata**, not tax authority. Risk: operators may believe regional SAR + taxPolicyRef affect checkout (they do not).
