# CURRENT CHARGED TERMS FORENSICS

Before this program, Charged Terms lived on `commercial_subscription_bindings` (unique `subscriptionId`). `planVersionId` / `snapshotId` were dropped in 0086. `commercial_snapshot_definitions` was dropped.

Writers: Admin create (`persistAdminCreateChargedTerms`, insert-only); webhook `bindSubscriptionToLivePlan` (`onDuplicateKeyUpdate` of charged fields — overwrite). Admin update did not write terms.

Readers: `getSubscriptionCommercialBinding`, `loadChargedTermsForMrr`, `generateInvoicePDF` (current binding amount), entitlement snapshot loader (display only).

Production (prior SELECT): 6 subscriptions, 2 complete bindings, 4 unbound. No snapshot table.
