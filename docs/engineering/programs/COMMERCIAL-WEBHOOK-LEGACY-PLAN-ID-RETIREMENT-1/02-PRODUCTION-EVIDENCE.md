# 02 — PRODUCTION EVIDENCE

**Queried at:** `2026-08-15T14:12:49.531Z`  
**Access:** PRODUCTION (`tidbcloud_prod` / `mineuqr` / TLS / port 4000 / gateway01 shape)  
**Mutation:** NONE  
**Provider APIs:** NONE  
**Script:** `_readonly-proof.mjs`  
**Capture:** `_QUERY-EVIDENCE.json`

## What is retained

| Store | Finding |
|-------|---------|
| Tables named webhook / paypal / tap / payload / inbox / ops_log / checkout | **None** |
| Columns named webhook / custom_id / plan_id / providerEvent | **None** on commercial/payment tables |
| `order_domain_outbox.payload` | Exists; event types are Order* only; status **published** 396 / pending **0** |
| `print_jobs.payloadJson` | Print jobs, not PayPal/Tap |
| `audit_events` | 2227 rows; webhookish `eventType` **0**; metadata `planId` / `plan_id` / `custom_id` / `provider` **0** |
| Process `opsLog` | Not queryable from the database |
| In-memory `webhookDedup` | Not queryable; lost on process restart |

**Conclusion:** MineuQR Production does **not** retain PayPal/Tap webhook bodies or `custom_id` / `metadata.plan_id` values. Integer webhook traffic **cannot** be counted from the database.

## What is not a webhook payload

| Observation | Meaning |
|-------------|---------|
| `user_subscriptions.planId` = UUID for all 6 rows | Storage identity after OD-2/OD-3. **Not** proof of webhook metadata shape. |
| `stripeSubscriptionId` present on **0** of 6 rows | Provider transaction ids are not currently stored on these rows. **Not** a payload archive. |
| Bindings: 2 rows, `legacyPlanId` non-null | Column exists (out of scope). Not webhook event history. |
| Invoices: 8 `pending` | No plan identity / provider payload columns. Not a replay queue. |
| `renewal_notifications`: 52 | Unrelated to PayPal/Tap webhook bodies. |

## Unprocessed / retry queues

| Candidate | Result |
|-----------|--------|
| Webhook inbox / DLQ table | **Does not exist** |
| `order_domain_outbox` pending | **0** (and Order domain only) |
| In-app webhook replay of stored provider payloads | **Impossible** — nothing stored |

A provider can still deliver or retry an event whose metadata lives **on PayPal/Tap**, not in MineuQR. That set was **not** inventoried (provider APIs not called).

## Integer webhook traffic after OD-3

**UNKNOWN.**

Absence of a payload store is not evidence of zero integer traffic. Do not convert this UNKNOWN into zero.

## Observational snapshot (unchanged by this SELECT)

Compared with OD-3 certification SELECT `2026-08-15T13:29:47.217Z` (7 subscription rows: active 5, expired 2), this SELECT saw 6 rows (active 5, expired 1). This program issued no DML. The difference is **not** attributed to webhook retirement (none occurred). It is recorded only so later certification does not assume the OD-3 counts.

## Mutation audit

No INSERT/UPDATE/DELETE/DDL. No payment transaction created.
