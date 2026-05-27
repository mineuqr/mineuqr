# TZ-6A — Timezone Risk Inventory

Engineering inventory for MineuQR timezone stabilization. **Documentation only** — no runtime changes in this phase.

Canonical contract: [timezone-contract.md](./timezone-contract.md)

---

## CRITICAL

| File | Risk type | Explanation | Phase |
|------|-----------|-------------|-------|
| ~~`server/db.ts` — `isSubscriptionActive`, `getTrialEndDate`~~ | ~~Host-local parse~~ | **TZ-6B done** — uses `parseStoredUtcInstant`. | — |
| ~~`server/routers/scheduled-tasks.ts` — `sendRenewalNotifications`~~ | ~~Host-local parse~~ | **TZ-6B done** — `parseStoredUtcInstant` for `currentPeriodEnd`; day math still UTC ms-based (business-TZ day buckets deferred). | **TZ-6C+** (optional day-boundary) |
| ~~`server/db.ts` — `getRevenueByMonth`~~ | ~~Host-local bucketing~~ | **TZ-6D done** — uses `businessYearMonthMonthsAgo` + `isInBusinessYearMonth` + `formatBusinessYearMonthLabel`. | — |
| `server/routers.ts` — admin subscription create/update | Civil date → instant ambiguity | `subscriptionEndDate` (`YYYY-MM-DD`) converted via `new Date(...).toISOString()`; semantics differ from display helpers. | **TZ-6B** |
| `server/tap-webhook.ts`, `server/paypal-webhook.ts` | Host-local period math | Period end via `setMonth` / `setFullYear` on host `Date`; PayPal path ignores billing cycle. | **TZ-6B** |
| `server/create-trial-subscription.ts` | Host-local period math | Trial end uses `setDate(+14)` on local calendar; must align with shared period-end rules. | **TZ-6B** |
| `client/src/lib/subscription/dates.ts` — `suggestSubscriptionEndDateInput` | Host-local calendar math | Admin date suggestions use `getFullYear/getMonth/getDate`; can disagree with server period end. | **TZ-6B** |

---

## MEDIUM

| File | Risk type | Explanation | Phase |
|------|-----------|-------------|-------|
| `server/owner-email-notifications.ts` — `formatDate` | Server-local render | `toLocaleDateString("ar-SA")` without `{ timeZone }`; audit emails show server TZ, not Riyadh. | **TZ-6C** |
| `server/invoice-pdf.ts` | Server-local render | PDF/HTML invoice dates use `toLocaleDateString` without explicit timezone. | **TZ-6C** |
| `server/routers.ts` — subscription notifications | Server-local render | Admin messages embed `periodEnd.toLocaleDateString("ar-SA")`. | **TZ-6C** |
| `client/src/pages/Statistics.tsx` — CSV export | Browser-local + ISO slice | Row dates via `toLocaleDateString`; filename uses `toISOString().split("T")[0]`. | **TZ-6C** |
| `client/src/pages/SubscriptionManagement.tsx` | Browser-local render | Renewal date shown with `new Date(...).toLocaleDateString()`. | **TZ-6C** |
| `client/src/pages/SubscriptionSuccess.tsx`, `PaymentHistory.tsx`, `Users.tsx` | Browser-local render | Subscription/payment dates may use locale-default formatting. | **TZ-6C** |
| `client/src/lib/excel/salesReport.ts`, `reportLayout.ts` | Export labeling | Report timestamps may not use explicit business timezone. | **TZ-6C** |
| `server/db.ts` — `getActiveOffersByRestaurant` | Instant comparison | Offer window uses raw `new Date()` in SQL compare; verify stored offer dates are UTC-consistent. | **TZ-6B** (if offers are business-critical) |
| `server/routers.ts` — order notification `sentAt` | Manual ISO slice | `toISOString().slice(0, 19).replace('T', ' ')` produces ambiguous DB-style strings. | **TZ-6C** (format standardization) |

---

## SAFE / CENTRALIZED

| File | Risk type | Explanation | Phase |
|------|-----------|-------------|-------|
| `shared/utils/timezone.ts` | Canonical layer | `parseStoredUtcInstant`, `getRestaurantNow`, `todayYmd`, `formatInRestaurantTimezone`, business-month helpers. **Extend, do not duplicate.** | Maintain |
| `shared/utils/restaurantHours.ts` | Canonical hours | Open/closed uses `getRestaurantNow` + `Intl` with `timeZone`; overnight ranges supported. | Maintain |
| `client/src/lib/datetime.ts` | Client shim | Re-exports shared timezone helpers; preferred client import path. | Maintain |
| `server/lib/restaurantHours.ts` | Re-export shim | Server re-export of shared hours/timezone utilities. | Maintain |
| `client/src/pages/Dashboard.tsx` — order reports | Safe bucketing | Uses `convertUtcToRestaurantTime(...).ymd` and `todayYmd()` for order day/month grouping. | Pattern to replicate |
| `server/db.ts` — `getExtendedAdminStats.userGrowth` | Safe bucketing | Uses `businessYearMonthMonthsAgo` + `isInBusinessYearMonth` in `APP_TIMEZONE`. | Pattern to replicate |
| ~~`server/db.ts` — `getRevenueByMonth`~~ | ~~Partial safe parse~~ | **TZ-6D done** — business-month bucketing via `isInBusinessYearMonth`. | — |
| `server/routers.ts` — `holiday.listPublic` | Safe civil date | Uses `todayYmd()` for holiday `YYYY-MM-DD` comparison. | Maintain |
| `client/src/lib/subscription/dates.ts` — `formatSubscriptionEndDate` | Safe display | Date-only values normalized to noon UTC + `formatRiyadhDate` for display. | Maintain |

---

## Recommended phase order

1. **TZ-6B** — Entitlements, subscription period computation, scheduled reminders (parsing correctness).
2. **TZ-6C** — Emails, PDFs, exports, client/admin display strings (explicit `timeZone`).
3. **TZ-6D** — Revenue/month reporting buckets aligned to business calendar in `APP_TIMEZONE`.

---

## Out of scope for TZ-6 (note only)

- Per-restaurant IANA timezone field (schema) — document in contract; implement when multi-country is approved.
- New date libraries (Luxon/dayjs) — not required for current stabilization path.
- Mass `new Date()` replacement — use inventory + phased migrations only.
