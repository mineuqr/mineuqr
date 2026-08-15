# CHARGED TERMS CREATION

Written on `commercial_subscription_bindings`:

| Field | Source |
|-------|--------|
| chargedAmount | current Live Plan offer for the selected cycle |
| chargedCurrency | that price row’s currency |
| billingCycleCode | Admin-selected monthly \| yearly |
| billingCycleId | catalog cycle id |
| planId | Live Plan UUID |

No new columns. Historical rows are not updated by this writer.

Admin **update** does not call persist and does not overwrite existing Charged Terms.
