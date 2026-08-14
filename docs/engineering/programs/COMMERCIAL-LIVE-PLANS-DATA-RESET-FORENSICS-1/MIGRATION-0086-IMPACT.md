# MIGRATION-0086-IMPACT.md

**Program:** COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1  
**File:** `drizzle/0086_commercial_live_plans.sql`  
**Applied:** **NO**  
**Do not apply during this program.**

---

## What 0086 would do to *this* database

| Step | Actual data effect |
|------|-------------------|
| ADD composition columns on `commercial_plans` | Additive, empty |
| Copy composition from `state='published'` versions | **Only `001` and `002`** receive bundle/limit/trial. Standard plans stay NULL after this step |
| Fallback copy from any version | `basic` / `professional` / `enterprise` get **retired v1** composition |
| ADD `commercial_prices.planId` + backfill from versions | All 14 prices join a version → planId populated |
| DELETE non-published prices if a published twin exists | Standard-plan prices **kept** (no published twin). `001`/`002` have only published prices |
| `planId` NOT NULL + DROP `planVersionId` | Succeeds if backfill complete |
| Rename promotions column | 0 promotion rows |
| ADD binding `planId` / charged* | 0 binding rows |
| `DELETE bindings WHERE planId IS NULL` | **0 rows deleted** |
| Charged-term JSON from snapshots | **0 snapshots, 0 bindings** — no backfill |
| DROP snapshot / publication / version / retirement tables | Drops 0 snapshots, 0 publication rules, **5 versions**, **3 retirement policies** |

---

## Is destruction “safe” given actual rows?

**Disposable as data:**

- 0 bindings, 0 snapshots
- No invoice/subscription FK into these tables
- Versions consumed only by catalog prices/bundles

**Unsafe as a conversion:**

1. It **does not produce** the approved live catalog. It produces live `001` + `002` plus retired-v1 composition on Basic/Professional/Enterprise.
2. Basic live price would remain **0.00 USD**.
3. It still **drops** version/snapshot tables in the same cutover (Architecture Authority already blocked that shape).
4. Uncommitted application code already expects post-0086 columns; applying 0086 without a matching bootstrap of the **three** plans leaves the wrong commercial SSOT.

**Do not approve current 0086 merely because there are no paying subscribers.** The objects are disposable, but this script **rehomes the wrong plans**.

---

## Can 0086 be redesigned as a clean reset?

**Yes.** A replacement migration (not this file) should:

1. Add live-plan columns / `prices.planId` / binding charged-term columns **additively**
2. Truncate or delete **catalog aggregate** rows only (`commercial_plans`, versions, prices, bundles, limits, policies, promotions, snapshots, publication rules)
3. **Not** touch `user_subscriptions`, `invoices`, `payments`, `subscription_history`, `subscription_plans`, `users`, `restaurants`, orders, settlement
4. Bootstrap Basic / Professional / Enterprise as live plans from Projection
5. Drop version/snapshot/publication/retirement tables only after hydrate of the live schema is proven — or keep them empty until a later retirement program

Current 0086 is **not** that migration.
