# Promotion Platform

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Promotions are independent (**CC-08**)

Promotions **never modify Plan Versions**.

They overlay commercial terms at purchase/renewal time without mutating the immutable Version contract.

---

## 2. Examples

Coupons · Campaigns · Partner Discounts · Launch Offers · Black Friday · Ramadan Offers · Referral Rewards · Channel partner rates  

---

## 3. Promotion definition (conceptual)

| Field | Purpose |
|-------|---------|
| promotionId | Stable id |
| type | coupon / campaign / partner / referral / … |
| eligibility | plans/versions/regions/tenants/channels |
| effect | percent off, fixed off, free cycle, trial extend |
| window | start/end |
| stacking rules | exclusive / combinable |
| audit | createdBy, status |

Effects apply to **charges** (Billing) or **trial length** (Subscription) — not to Version feature/limit/price rows.

---

## 4. Laws

| Rule ID | Statement |
|---------|-----------|
| **PROMO-01** | Promotions never edit Published Plan Versions. |
| **PROMO-02** | Invoice line items record promotion id + base Version price for reproducibility. |
| **PROMO-03** | Expired promotions do not rewrite history. |
| **PROMO-04** | Partner discounts are Catalog promotions — not ad-hoc Billing SKUs. |

---

## 5. Interaction with pricing

Prefer: Version holds list price; Promotion applies adjustment.  
Avoid: “promotional price” rows that mutate after publish — use Promotion plane instead.
