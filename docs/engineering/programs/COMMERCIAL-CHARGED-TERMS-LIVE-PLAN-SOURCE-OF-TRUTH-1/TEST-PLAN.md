# TEST PLAN

| # | Case | Coverage |
|---|------|----------|
| 1–2 | New monthly/yearly uses Live Plan cycle price | `adminChargedTermsCompletion.test.ts` |
| 3–5 | Distinct snapshots / same plan different prices | `livePlanPriceAuthority.test.ts`, `chargedTermsMrr.test.ts` |
| 6–7 | MRR sums snapshots; ARR = MRR×12 | `chargedTermsMrr.test.ts`, CanonicalMetricsService guard |
| 8–11 | Plan/cycle change appends; yearly not ×12 | snapshot versioning + Admin completion |
| 12–16 | Fail closed; no subscription_plans / Binding / legacyPlanId price | Admin completion + livePlanPriceAuthority |
| 17–18 | Webhook does not create Snapshot #2; idempotent retry | `chargedTermsSnapshotVersioning.test.ts` |
| 19–21 | Trial / complimentary / entitlements | existing trial tests; no chargedAmount=0; entitlement hub |
| 22–24 | No Binding backfill; 780001 absent from 0089; unrelated tables untouched | migrationGovernance + livePlanPriceAuthority |
