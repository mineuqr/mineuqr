# TZ-6B — Period-end generation review (documentation only)

Status: **Review complete** — no period-end *generation* changes in TZ-6B (parsing/comparison only).

Parsing/comparison stabilized in TZ-6B:
- `server/db.ts` — `isSubscriptionActive`, `getTrialEndDate`
- `server/routers/scheduled-tasks.ts` — `sendRenewalNotifications`

---

## Inconsistencies (deferred — not TZ-6B scope)

| Location | Pattern | Risk |
|----------|---------|------|
| `server/routers.ts` — admin create/update subscription | `new Date(subscriptionEndDate)` for civil `YYYY-MM-DD`; `setMonth` / `setFullYear` on host `Date` | Civil date → instant depends on server TZ; month rollover uses host calendar |
| `server/create-trial-subscription.ts` | `setDate(+14)` on host `Date`, stored as `.toISOString()` | Trial end is host-local +14 days, not explicit business TZ |
| `server/tap-webhook.ts` | `setMonth(+1)` from payment time | Renewal anchor is webhook processing instant (OK) but month math is host-local |
| `server/paypal-webhook.ts` | `setMonth(+1)`; billing cycle not applied | May disagree with Tap path and admin `yearly` handling |
| `client/src/lib/subscription/dates.ts` — `suggestSubscriptionEndDateInput` | `getFullYear/getMonth/getDate` | Admin UI suggestions can disagree with server-computed period end |

---

## Semantic ambiguity (unresolved)

**`subscriptionEndDate = "YYYY-MM-DD"`** is a civil date. Contract ([timezone-contract.md](./timezone-contract.md)) proposes “active through end of business day in `APP_TIMEZONE`”, but writers still use `new Date("YYYY-MM-DD")` (UTC midnight interpretation in modern engines) or host-local month math.

**Recommendation for TZ-6B+ follow-up (not TZ-6B):** single helper `civilDateToPeriodEndInstant(ymd, timeZone)` used by admin routers and webhooks; keep stored values as UTC ISO instants.

---

## Remaining phases

- **TZ-6C** — Rendering (`toLocaleDateString` without `timeZone`, PDFs, emails, client pages)
- **TZ-6D** — `getRevenueByMonth` host-local month buckets
