# OPEN DECISIONS

Not started. Not implemented.

| ID | Decision | Notes |
|----|----------|--------|
| OD-ADMIN-CT-01 | Fail-closed vs fail-soft when Admin bind/Charged Terms write fails | Minimum completion program proposes fail-closed for qualifying creates. Not authorized yet. |
| OD-ADMIN-CT-02 | Whether INTERNAL Admin-created subscriptions should ever enter certified MRR | Today: COMMERCIAL population only. 780001 is INTERNAL. Independent of Charged Terms. |
| OD-ADMIN-CT-03 | Pre-cutover unbound rows (600001, 690001, 750001, 780001) | Leave unchanged unless original terms are independently proven. Do not use current catalog. |
| OD-ADMIN-CT-04 | Re-bind overwrite vs immutable Charged Terms / new snapshot row | Current `onDuplicateKeyUpdate` mutates historical amount. Conflicts with Charged Terms immutability. |
| OD-ADMIN-CT-05 | Admin-entered custom amount vs catalog snapshot at bind | Today there is no amount input. UI $99 is display-only. |
| OD-ADMIN-CT-06 | Duplicate account-level rows (user 14760004) | Create guard is entitlement-based, so elapsed `active` rows accumulate. No cleanup in this program. |
| OD-ADMIN-CT-07 | Yearly Admin bind currently snapshots monthly catalog price | Must be fixed in any completion program via passing `billingCycleCode`. |

Out of scope (not opened here): OD-3, OD-4, SAFE DELETE, webhook retirement, `subscription_plans` DROP, Tax, FX, Refund, Credit Note, POS.
