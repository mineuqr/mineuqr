# COMMERCIAL-PLAN-INVENTORY.md

**Program:** COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1

Approved target: **Basic / Professional / Enterprise** as live plans.

---

## Plans in production

| Plan ID | Code | Name | Hidden | Versions | Published | Snapshots | Prices | Included caps (published bundle) | Catalog bindings | Subscribers via binding |
|---------|------|------|--------|----------|-----------|-----------|--------|----------------------------------|------------------|-------------------------|
| 8569e399-… | `001` | الخطة الاساسية | no | 1 | **1** | 0 | 2 (19/190 USD) | 12 | 0 | 0 |
| d5fea7b5-… | `002` | الخطة الاحترافية | no | 1 | **1** | 0 | 2 (39/390 USD) | 14 | 0 | 0 |
| 5a20644f-… | `basic` | Basic | no | 1 | **0** (retired) | 0 | 2 (0.00 USD) | 0 published | 0 | 0 |
| a8ae706c-… | `professional` | Professional | no | 1 | **0** (retired) | 0 | 4 (99 SAR / 26.40 USD) | 0 published | 0 | 0 |
| 4796e810-… | `enterprise` | Enterprise | no | 1 | **0** (retired) | 0 | 4 (299 SAR / 79.73 USD) | 0 published | 0 | 0 |

Subscriber counts on **legacy** `user_subscriptions` (not catalog):

| Legacy `subscription_plans` | Subs |
|-----------------------------|------|
| 30001 Basic | 0 |
| 30002 Professional | 4 (owner + test user) |
| 30003 Enterprise | 1 (internal admin) |

---

## Compare to approved three plans

| Approved | DB `commercial_plans` | Usable as live plan today? |
|----------|----------------------|----------------------------|
| Basic | Row exists; **version retired**; price **0 USD** | No — not published; wrong price |
| Professional | Row exists; **version retired** | No — not published |
| Enterprise | Row exists; **version retired** | No — not published |
| — | Extra `001`, `002` **are** the only published plans | **Wrong product identity** |

---

## Retain as live plans vs recreate

**Do not preserve these rows as the live catalog.**

Reasons:

1. The published catalog is `001`/`002`, not Basic/Professional/Enterprise.
2. The approved codes are retired with incomplete/zero pricing on Basic.
3. No subscriber is bound to any of these IDs, so recreation does not strand a binding.
4. Composition for retired v1 is a bootstrap snapshot from 2026-07-30, then superseded by admin UI experiments on 2026-08-02.
5. Current 0086 in-place convert would **keep `001`/`002` as live published plans**.

**Safer:** wipe commercial catalog aggregates and bootstrap the three approved live plans from Projection (existing `bootstrapPersistentCommercialCatalog` path, live-plan variant).

**Retain separately:** `subscription_plans` 30001–30003 (legacy checkout / unbound entitlements) until checkout is intentionally redesigned — out of this program.
