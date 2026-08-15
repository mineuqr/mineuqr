# IMPLEMENTATION

## Decision

A dedicated `commercial_subscription_concessions` table holds insert-oriented concession versions. `user_subscriptions` keeps Live Plan identity and period end. Charged Terms snapshots remain paid-commitment facts only.

## Paid Admin create (Path A) — unchanged

When `freePeriod` is absent:

1. Resolve Live Plan UUID
2. Resolve `currentPriceForPlan(planId, billingCycleCode)`
3. Create `status=active` (or requested status) subscription
4. Persist Binding + Charged Terms Snapshot #1
5. Fail closed / compensate-delete if snapshot persist fails

`persistAdminCreateChargedTerms` remains the paid writer.

## Free-first Admin create (Path B)

When `freePeriod = { unit, duration, reason }`:

1. Reject `status=trial` (`trial_conflict`)
2. Reject explicit `subscriptionEndDate` (`conflicting_period_end`)
3. Resolve Live Plan UUID and validate the selected-cycle offer exists (catalog display / later paid readiness). The offer is **not** snapshotted.
4. Create `status=active` subscription with `currentPeriodEnd = concession.endsAt`
5. Persist concession version 1
6. **Do not** call `persistAdminCreateChargedTerms`
7. If concession persist fails: delete the new subscription and fail closed

## Grant on existing subscription

`applyAdminConcessionGrant` → `grantCommercialConcession`.

- Live Plan identity unchanged
- Existing snapshots unchanged
- Binding leftover unchanged
- Period end aligned forward to `endsAt` when later than current
- Current concession suppresses MRR

Trial, canceled, expired, and protected-user subscriptions are rejected.

## Revise / extend / shorten

`reviseCommercialConcession` inserts a new version with `startsAt = now` and the new duration/unit. The prior current row is marked `superseded` with `supersededBy`. Grant facts on the prior row are not rewritten.

Revise is a replacement window from commit time, not a mutation of the original `startsAt`.

## Cancel

`cancelCommercialConcession` sets `status=cancelled` and `cancelledAt` on the current row. Grant duration/dates remain.

- If no current snapshot exists (`expirePeriodIfUnpaid`): `currentPeriodEnd = now`
- If a paid snapshot exists: period end is left in place so snapshot MRR can resume

No charge is created.

## Plan / cycle change during a current concession

`applyAdminUserSubscriptionUpdate` loads the current concession. If current:

- Update `user_subscriptions` identity
- Update Binding `planId` only (`updateEnrollmentPlanIdOnly`)
- **No** Charged Terms snapshot

The first later paid commitment uses `currentPriceForPlan` at commitment time for the then-selected cycle. Yearly uses the yearly Live Plan offer, not `monthly × 12`.

## Webhook

`bindSubscriptionToLivePlan` still resolves the current Live Plan offer. Snapshot insert is skipped while a concession is current. Integer webhook compatibility is unchanged. Retry still cannot overwrite an immutable snapshot.

## Invoice

Admin invoice creation refuses a current concession. Amount is `snapshot.chargedAmount`, never Binding leftover.

## Calendar

- `day`: exact elapsed UTC milliseconds (`duration * 86_400_000`)
- `month`: civil UTC calendar month via `addUtcCalendarMonths` (Jan 31 + 1 month → Feb 28/29)
- Immediate only: `startsAt = now`
- Duration bounds: days 1–366, months 1–24

## Files

| Area | Path |
|------|------|
| Calendar | `shared/commercial-concession/calendar.ts` |
| Schema | `server/db/schema/commercial/concessions.ts` |
| Domain | `server/commercial/concessions.ts` |
| Admin wrappers | `server/commercial/adminConcessions.ts` |
| Create/update | `server/subscriptionAudit.ts` |
| MRR | `server/commercial/metrics/chargedTermsMrr.ts` |
| Webhook | `server/services/commercial-catalog/adoptionService.ts` |
| Procedures | `server/routers.ts` |
| UI | `SubscriptionAdminFormFields.tsx`, `CustomerSuccessAccountsSection.tsx` |
| Migration | `drizzle/0090_commercial_subscription_concessions.sql` |
