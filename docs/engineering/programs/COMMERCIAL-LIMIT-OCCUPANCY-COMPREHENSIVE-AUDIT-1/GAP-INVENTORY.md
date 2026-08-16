# GAP INVENTORY

Every finding has exactly one class.

## A. REQUIRED NOW

| ID | Issue | Why not defer |
|----|--------|----------------|
| G-01 | POS **provisioned replace** skips occupancy lock (`performReplace(null)`). Concurrent replaces can leave **two** provisioned terminals and occupancy **> cap**. | Real commercial invariant break. Existing `occupancyDelta: 0` unused. |

## B. REQUIRED FOUNDATION FOR FUTURE

| ID | Issue |
|----|--------|
| G-02 | Occupancy-adopting **application not deployed**; Production still check-then-act despite 0094. |
| G-03 | GIT COMMIT must include occupancy code + update `CANONICAL_MIGRATION_TAIL_TAG` to 0094. |
| G-04 | Onboarding does not assert trial `restaurants` cap ≥ 1 (fails closed if cap is 0). |
| G-05 | `deleteRestaurantCascade` does not delete `pos_terminals` (orphan rows). |
| G-06 | tRPC maps occupancy-unavailable and POS limit-exceeded to the **same** auth string. |
| G-07 | TiDB `FOR UPDATE` concurrency not proven (MySQL 8 only). |
| G-08 | Domain-table (restaurants/categories/items/pos_terminals) race tests not run; helper-only. |

## C. POLICY DECISION REQUIRED

| ID | Issue |
|----|--------|
| G-09 | Admin category/item **skip quantity occupancy** while admin restaurant create **honors** it. Conflicts with CE “role ≠ commercial capacity” unless product explicitly allows support-exceed. |
| G-10 | Inactive restaurants/categories/unavailable items **still occupy**. Should they? |
| G-11 | Plan downgrade: keep excess operational, no freeze. Freeze is product, not occupancy math. |

## D. SAFE TO DEFER — WITH JUSTIFICATION

| ID | Issue | Why no material occupancy/security/tx risk if left |
|----|--------|------------------------------------------------------|
| G-12 | Restaurant/category/item create idempotency keys | Helper prevents overflow; duplicates below cap are catalog UX. |
| G-13 | Quantity occupancy for `staffAccounts` / `branches` / `ordersPerMonth` / `qrCodes` / `storage` / `images` | **No create path** uses those as COUNT occupancy. Devices are feature-gated. |
| G-14 | Delete unused `assertProvisioningAllowed` / `assert*CreateAllowed` | Not on live insert paths. |
| G-15 | Occupancy metrics/tracing | Fail-closed; ops can use existing logs after G-06. |
| G-16 | `NODE_ENV==="test"` unlocked path | Production deploy uses `NODE_ENV=production`; injected `db` always locks. Residual footgun, not current Production config. |

## E. INTENTIONAL BYPASS — ARCHITECTURALLY CORRECT

| ID | Issue |
|----|--------|
| G-17 | First restaurant in `registerOwnerTransactional` (0→1) without occupancy, given current trial Professional cap ≥ 1. |
| G-18 | `checkLimit` on a second connection inside the occupancy tx (cap read, not COUNT+INSERT split). |

## F. ARCHITECTURAL VIOLATION — MUST NOT EXIST

None newly introduced (no POS lock table, no second counter, no global lock, no locking `commercial_limit_values`).

**G-09** is a **policy/constitution tension**, not classified F unless product confirms support-exceed is forbidden.

## Not hidden under D

G-01 (replace race) and Production undeployed check-then-act (G-02) are **not** SAFE TO DEFER.
