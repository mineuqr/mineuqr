# 06 — MRR / ARR IMPACT

Authority unchanged: current immutable Charged Terms snapshot; current concession suppresses; no Binding / catalog / `subscription_plans` fallback. ARR = MRR × 12.

## Per model (paid, no concession)

Assume Snapshot #1 = $29. Catalog now $39. Row canceled or expired.

| | Before | Immediately after | Later catalog → $49 |
|---|--------|-------------------|---------------------|
| A (rejected) | 0 | 29 | 29 |
| **B (contract)** | 0 | **39** | **39** |
| C (rejected) | 0 | 39 (new subscriptionId) | 39 |

## Free reactivate

Before = 0. After = 0. Catalog change = 0. No snapshot.

## Paid reactivate then concession grant

MRR becomes 0 while concession is current. Snapshot remains historical/current but suppressed. Cancel concession → MRR returns to **that** snapshot, not the catalog.

## Yearly

Monthly equivalent = `chargedAmount / 12` from the **yearly offer** stored on the new snapshot. Not monthly × 12.

## Dual-row (current accidental C)

If create-after-cancel leaves two rows, MRR follows the entitled row’s current snapshot only (`countsInMrr`). The contract forbids this as the Reactivation path. Implementation must CONFLICT create when an account-level row already exists.
