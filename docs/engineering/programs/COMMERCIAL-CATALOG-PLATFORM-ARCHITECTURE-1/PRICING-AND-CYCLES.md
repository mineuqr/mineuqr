# Pricing & Billing Cycles

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Pricing Platform (within Catalog)

**CC-05:** Pricing is **version-scoped**.

Pricing belongs to a **Plan Version**. Changing price for new customers ⇒ new Version (or additive price book row under Draft before publish — never mutate published price rows).

---

## 2. Supported cycle definitions

| Cycle | Notes |
|-------|-------|
| Monthly | Standard SaaS |
| Quarterly | Optional |
| Yearly / Annual | Standard SaaS |
| Custom | Enterprise negotiated interval |
| Usage | Meter-linked; billing provider consumes meters (OOS) |

Cycle **definitions** are Catalog-owned reusable types. Versions declare which cycles they offer.

---

## 3. Pricing dimensions (extensible)

| Dimension | Examples |
|-----------|----------|
| Currency | USD, EGP, EUR, SAR, AED, PHP, … |
| Region / Country | Regional price books (**CC-15**) |
| Tax Policy ref | Catalog-owned reference; Billing calculates (**CC-15**) |
| Distribution Partner | Channel-specific availability (**CC-15**) |
| Launch pricing | Time-boxed introductory rows (prefer Promotion plane when discounting) |
| Promotional pricing | Prefer **Promotion Platform** overlays — do not rewrite Version prices |
| Seat / unit | Optional quantity basis metadata |

**Future pricing models must not require redesign** — add dimensions/rows; keep Version immutability.

Regional commercialization is **Catalog-owned**, not Billing-owned, not Subscription-owned (**CC-15**).

---

## 4. Laws

| Rule ID | Statement |
|---------|-----------|
| **PRC-01** | Published price rows are immutable. |
| **PRC-02** | Billing providers read Catalog prices; they do not author SKUs. |
| **PRC-03** | Historical invoices reference the price/version snapshot at charge time. |
| **PRC-04** | Currency/region expansion is additive. |
| **PRC-05** | Usage pricing attaches meter keys from Limit/Usage catalogs — not domain hardcoding. |
| **PRC-06** | Regional prices and tax-policy refs are Catalog SSOT (**CC-15**). |
| **PRC-07** | Publish requires valid pricing for intended markets (**CC-16**). |

---

## 5. Independence

Pricing is independent of Feature Catalog identity and of Subscription lifecycle. Subscription selects a Version + cycle; Catalog supplies the price contract.
