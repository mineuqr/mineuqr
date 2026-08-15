# TEST PLAN

Covered in `chargedTermsSnapshotVersioning.test.ts`, Admin persist/update tests, MRR guards, migration governance 0089, identity/webhook/trial/invoice suites.

| # | Case | How |
|---|------|-----|
| 1–2 | Initial + idempotent retry | insert skipped when current matches |
| 3–5 | Plan change new version, old untouched | insert version+1, no snapshot UPDATE |
| 4,7–8 | monthly↔yearly uses selected-cycle amount | cycle-change insert; match fails across cycles |
| 16–17 | MRR current only | loader returns one row per subscription |
| 18 | Invoice overlay | `getSubscriptionCommercialBinding` reads current snapshot |
| 20–21 | no subscription_plans / legacyPlanId price | source guards; no snapshot UPDATE |
| 22 | Admin create still persist Binding | existing tests + snapshot insert |
| 23–25 | trial / PayPal integer path unchanged; bind no longer overwrites charged on dup | trial-and-webhook + adoptionService guard |
| 26 | checkout price unchanged | no checkout files edited |

Invoice overlay, entitlements Live Plan, checkout/trial unchanged by design (no checkout/trial edits). Fail-closed missing Live Plan / cycle price / currency remain Admin create tests. Catalog price change does not write snapshots (no catalog writer change).
