# MineuQR Timezone Contract (TZ-6A)

Status: **Baseline / Guardrails** (no runtime changes).

This document defines the **timezone contract** for MineuQR so future changes are deterministic, Riyadh-correct, and multi-country ready.

---

## Core principles

### 1) Store UTC instants
- Persist timestamps as **UTC instants** (prefer ISO-8601 with `Z` when possible).
- Treat existing DB timestamp strings that lack a timezone suffix as **stored-UTC by convention** (see parsing rules).

### 2) Render local (business timezone)
- Business-facing dates/times must be rendered in an **explicit timezone**, not “whatever the server/browser is”.
- **Riyadh-first**: the current business timezone baseline is `Asia/Riyadh` (`APP_TIMEZONE`).

### 3) Explicit boundaries
- **Parsing boundary**: DB/API → `Date` must go through approved parsing helpers.
- **Rendering boundary**: `Date`/timestamp → UI/email/PDF/export must go through approved formatting helpers with explicit `timeZone`.

### 4) Deterministic parsing
- Never rely on host defaults for parsing strings.
- Avoid implicit conversions that differ between Node/runtime/browser locales.

---

## Canonical helpers (approved)

Canonical module:
- `shared/utils/timezone.ts`

Approved helpers (use these; do not re-implement in components/routers):
- **Parsing**
  - `parseStoredUtcInstant(value)`
    - Parses DB/API timestamps safely, including DB-style `YYYY-MM-DD HH:mm:ss` (treated as UTC).
- **Business “now” and calendar keys**
  - `getRestaurantNow(now?, timeZone?)`
  - `todayYmd(now?, timeZone?)` → `YYYY-MM-DD` in the chosen timezone
  - `convertUtcToRestaurantTime(value, timeZone?)` → restaurant-local `{ ymd, minutes, weekdayIndex, hour, minute }`
- **Formatting**
  - `formatInRestaurantTimezone(value, locale, options?, timeZone?)`
  - `formatRiyadhDate(value, locale)` / `formatRiyadhDateTime(...)` / `formatRiyadhTime(...)`
- **Business-month helpers (reporting buckets)**
  - `businessYearMonthMonthsAgo(monthsAgo, now?, timeZone?)`
  - `restaurantYearMonth(value, timeZone?)`
  - `isInBusinessYearMonth(value, year, month, timeZone?)`
  - `formatBusinessYearMonthLabel(year, month, locale?, timeZone?)`

Client compatibility shim:
- `client/src/lib/datetime.ts` re-exports from `@shared/utils/timezone` and is the **preferred client import path**.

Working-hours canonical module:
- `shared/utils/restaurantHours.ts` (uses `getRestaurantNow` and supports overnight hours).

---

## Prohibited / dangerous patterns

### Parsing (string → Date)
- `new Date(dbString)` **when `dbString` may not include timezone suffix** (e.g. MySQL `DATETIME` strings).
  - Problem: interpretation becomes host-local and environment-dependent.

### Rendering (Date → string)
- `toLocaleDateString()` / `toLocaleString()` without `{ timeZone: ... }`
  - Problem: server/browser timezone changes output and can cause off-by-one-day around midnight.

### Business logic based on manual string slicing
- `split("T")[0]`, `slice(0, 10)`, `toISOString().slice(0, 19).replace("T"," ")` used for **business logic** or comparisons.
  - Allowed only for **purely cosmetic** display where the timezone is irrelevant (rare). Prefer approved helpers.

### Host-local bucketing for reports
- Using `new Date(y, m, d)` or `getMonth()/getFullYear()` for reporting buckets without an explicit business timezone.

---

## Parsing rules (official)

### Stored timestamps
- DB/API timestamp fields representing instants are treated as **UTC instants**.
- If a stored timestamp string lacks a timezone suffix (e.g. `YYYY-MM-DD HH:mm:ss`), it **must** be parsed using:
  - `parseStoredUtcInstant(value)`

### Date-only values
- `YYYY-MM-DD` is a **civil/business date**, not an instant.
- Never parse `YYYY-MM-DD` with `new Date("YYYY-MM-DD")` for business semantics without an explicit contract (see subscription semantics below).

---

## Rendering rules (official)

### Business-facing rendering
For business data (subscriptions, invoices, reports, admin, exports, emails, PDFs):
- Rendering must use `formatInRestaurantTimezone(..., { timeZone })` (or `formatRiyadh*` for the Riyadh-first baseline).
- Avoid browser-local rendering unless the feature is explicitly “viewer-local time” (rare in MineuQR).

### LTR/RTL correctness
- Prices/dates/times/emails/phone numbers shown in Arabic UI should be isolated in `dir="ltr"` spans (UI convention; see existing RTL hardening phases).

---

## Civil date vs instant semantics

### Instant (UTC timestamp)
- Example: `2026-05-27T21:15:00.000Z`
- Meaning: an exact point in time.
- Use for: createdAt/updatedAt, payment capture time, log timestamps, order creation, invoice issuedAt/paidAt, etc.

### Civil date (`YYYY-MM-DD`)
- Example: `2026-05-27`
- Meaning: a **calendar date in a business timezone**.
- Use for: holiday calendar dates, date-picker inputs, “period ends on (date)”.

TZ-6 migrations must not mix these implicitly.

---

## Subscription date semantics (baseline — documentation only)

MineuQR currently accepts admin inputs like:
- `subscriptionEndDate = "YYYY-MM-DD"`

This is a **civil date**. The intended meaning must be explicitly defined before TZ-6B:

### Proposed interpretation (recommended for SaaS ops)
- `subscriptionEndDate` means: “subscription remains active **through the end of this business day**”
- Business day timezone: **`APP_TIMEZONE` (Asia/Riyadh)** for now (until per-restaurant timezone exists).

### Notes
- This contract is **not implemented** in TZ-6A.
- TZ-6B should implement conversion from civil date → instant deterministically (e.g. end-of-day Riyadh), then store as UTC instant.

---

## Multi-country readiness (future)

When MineuQR supports restaurants outside Saudi Arabia:
- Introduce a per-restaurant IANA timezone identifier (e.g. `"Europe/London"`) and thread it into:
  - open/closed logic
  - order/report bucketing
  - invoice/subscription rendering
  - “today” / “this month” business keys

Until then:
- `APP_TIMEZONE` is the single authoritative business timezone baseline.

