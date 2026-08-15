# TEST PLAN

Targeted suite: **156 passed / 16 files**.

## Matrix

| # | Requirement | Coverage |
|---|-------------|----------|
| 1 | Paid Admin create unchanged | `subscriptionAudit.test.ts`, `adminChargedTermsCompletion.test.ts` |
| 2 | Free-first create | `subscriptionAudit.test.ts` free-first; `persistAdminFreeFirstConcession` |
| 3 | Days | `calendar.test.ts` |
| 4 | Calendar months | `calendar.test.ts` |
| 5 | Jan 31 + 1 month | `calendar.test.ts` → 2026-02-28 |
| 6 | Leap-year month | `calendar.test.ts` → 2024-02-29 |
| 7 | Zero duration rejected | calendar + domain |
| 8 | Negative duration rejected | calendar + domain |
| 9 | Invalid unit rejected | domain |
| 10 | Starts immediately | domain grant `startsAt <= now` |
| 11 | Expiration | calendar + `loadCurrentCommercialConcession` after `endsAt` |
| 12 | No automatic paid conversion | domain has no convert/snapshot writer |
| 13 | No snapshot on free-first | `persistAdminCreateChargedTerms` not called |
| 14 | Existing snapshot immutable | grant does not write Charged Terms |
| 15 | Paid snapshot + current concession → MRR 0 | `computeMrrFromChargedTerms` suppressed set |
| 16 | Paid snapshot + expired → MRR resumes | unsuppressed snapshot 29 → ARR 348 |
| 17 | No snapshot + expired → MRR 0 | empty terms map |
| 18 | ARR = MRR × 12 | same |
| 19 | Plan change during concession | source: identity-only branch |
| 20 | Cycle change during concession | same branch |
| 21 | Price change during concession | no snapshot writer on concession path |
| 22 | First later paid uses current price | `currentPriceForPlan` at commitment |
| 23 | Yearly uses yearly offer | `adminChargedTermsCompletion` + yearly create test |
| 24 | Extend | revise 30 → 60, version 2 |
| 25 | Shorten | revise 60 → 30, history immutable |
| 26 | Cancel | status cancelled, row retained |
| 27 | Identical grant idempotent | same id, one active |
| 28 | Concurrent grant protection | UNIQUE version + transaction + overlap |
| 29 | One current concession | overlap reject |
| 30 | Historical version immutable | superseded row keeps duration |
| 31 | Unauthorized Admin rejected | non-admin FORBIDDEN on grant/revise/cancel |
| 32 | Audit record | `commercial_concession_granted` |
| 33 | Webhook interaction | bind skips snapshot when concession current |
| 34 | Trial remains separate | `trial_conflict`; trial-and-webhook unchanged |
| 35 | `subscription_plans` unused | architecture guards |
| 36 | `legacyPlanId` not price source | architecture guards |
| 37 | Binding leftover not snapshot authority | `chargedTermsMrr` + live-plan guards |
| 38 | `chargedAmount=0` prohibited | snapshot + concession guards |
| 39 | Production rows unchanged | SELECT preview |

## Suites

`calendar`, `commercialConcession`, `subscriptionAudit`, `adminChargedTermsCompletion`, `chargedTermsSnapshotVersioning`, `chargedTermsMrr`, `canonicalMrrChargedTerms.guards`, `livePlanPriceAuthority`, `adminSubscriptionChargedTermsIntegrity`, `livePlanIdentity`, `CanonicalMetricsService`, `trial-and-webhook`, `migrationGovernance`, `admin-auth-1e`, `authorityCleanup1`, `admin-invoice-billing`.
