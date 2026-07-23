# ZERO-EPOCH-SMOKE-CLEANUP-1 — Report

| Field | Value |
|---|---|
| **Program** | ZERO-EPOCH-SMOKE-CLEANUP-1 |
| **Priority** | P0 |
| **Date** | 2026-07-23 |
| **Target** | Production TiDB `gateway01` / `mineuqr` |
| **Parent** | FINANCIAL-EPOCH-RESET-1 (certified; smoke left Epoch Start residue) |
| **Verdict** | **ZERO EPOCH RESTORED** |

---

## Executive Summary

Removed **only** the FINANCIAL-EPOCH-RESET-1 production smoke financial artifacts and restored true **Financial Epoch Zero**.

No architecture, Reporting, Check Aggregate, or Settlement Record logic was modified.

| Metric | Before cleanup | After cleanup |
|--------|---------------:|--------------:|
| Settlement Records | 1 | **0** |
| Settlement Transactions | 1 | **0** |
| Paid Checks | 1 | **0** |
| Revenue | 24.00 | **0.00** |
| Tax Collected | 3.13 | **0.00** |
| Average Check (Reporting) | 24.00 | **0.00** |
| Payment Analytics tender total | 24.00 | **0.00** |

Config (restaurants, users, menus, tables, devices, migrations) unchanged.

---

## Smoke Records Identified

All artifacts scoped to restaurant **720007**, single smoke session/check cluster:

| Anchor | ID |
|--------|-----|
| Restaurant | `720007` |
| Session | `2280001` |
| Check | `330001` (paid, grandTotal `24.00`) |
| Settlement Record | `sr:720007:330001:settlement:1` |
| Orders | `5670001`, `5670002`, `5670003` |
| Settlement Transaction | 1 captured cash tender (`24.00`) |
| Order Settlements / Membership | 3 / 3 |
| Table events | 3 |
| Order items | 3 |
| Order domain outbox | 3 |
| Business-day sequence | 1 (`2026-07-23`) |

**Isolation check:** Globally only **1** Settlement Record, **1** Check, **1** Session, **3** Orders existed — all matching smoke anchors. No non-smoke financial history present.

Order Read projections were already **0** (smoke did not materialize analytics rollups); Revenue was driven solely by Settlement Record publication.

---

## Deleted Tables

| Table | Rows deleted |
|-------|-------------:|
| `settlement_records` | 1 |
| `check_settlement_transactions` | 1 |
| `check_order_settlements` | 3 |
| `check_order_membership` | 3 |
| `operational_checks` | 1 |
| `table_events` | 3 |
| `order_items` | 3 |
| `order_domain_outbox` | 3 |
| `orders` | 3 |
| `dining_sessions` | 1 |
| `order_business_day_sequences` | 1 |
| MCA / split-payment tables | 0 (empty) |
| Order Read projections | 0 (already empty) |

**Tool:** `scripts/zero-epoch-smoke-cleanup.mjs`  
**Confirm:** `ZERO_EPOCH_SMOKE_CLEANUP_CONFIRM=YES`  
**Backup:** `artifacts/zero-epoch-smoke-cleanup-1/2026-07-23T20-16-25-118Z/` (gitignored)

---

## Row Counts Before

### Financial / operational (restaurant 720007 / global)

| Probe | Value |
|-------|------:|
| `settlement_records` | 1 |
| `check_settlement_transactions` | 1 |
| `operational_checks` (paid / all) | 1 / 1 |
| Revenue / Tax (SR SUM) | 24.00 / 3.13 |
| `dining_sessions` / `orders` | 1 / 3 |

### Config (preserved)

| Table | Count |
|-------|------:|
| `restaurants` | 6 |
| `users` | 3 |
| `menu_items` | 11 |
| `restaurant_tables` | 25 |
| `__drizzle_migrations` | 81 |

---

## Row Counts After

| Probe | Value |
|-------|------:|
| `settlement_records` | **0** |
| `check_settlement_transactions` | **0** |
| `operational_checks` | **0** |
| Revenue / Tax / Payment totals | **0.00** |
| `dining_sessions` / `orders` / membership / OS | **0** |
| `order_read_*` rollups | **0** |

Config after: restaurants **6**, users **3**, menu_items **11**, tables **25**, categories **6**, devices **2**, migrations **81** — **no drift**.

Cleanup tool verdict: **PASS**.

---

## Integrity Validation

| Check | Result |
|-------|--------|
| Smoke-only isolation before delete | **PASS** |
| Cleared financial tables empty globally | **PASS** |
| Config drift | **none** |
| Schema / migrations unchanged | **PASS** |
| Orphan Checks / SR / ST / OS | **none** |
| Enforced DB FKs | N/A (logical IDs) |

---

## Reporting Validation

Production Reporting Platform DTOs (restaurant `720007`):

| KPI | Value |
|-----|------:|
| Revenue | **0.00** |
| Paid Checks | **0** |
| Average Check | **0.00** |
| Tax Collected | **0.00** |
| Complimentary count / amount | **0** / **0.00** |
| Voided | **0** |
| Payment monetary tender total | **0.00** |
| Payment buckets | **0** (empty) |

Probe: `pnpm exec tsx scripts/zero-epoch-reporting-probe.mts` → `reportingZero: true`.

Dashboard / Excel / PDF consume these same contracts (`getBusinessMetricsSummary`, `getPaymentMethodAnalytics`) — financial KPIs and charts are empty at Epoch Zero. No Reporting code changes.

### Dashboard screenshots

Live UI screenshots were **not** captured in this execution (headless ops path). Evidence is production SQL zero probes + Reporting DTO zeros above, which are the canonical inputs for Dashboard / Excel / PDF.

---

## Final Certification

| Criterion | Status |
|-----------|--------|
| Revenue = 0 | ✓ |
| Settlement Records = 0 | ✓ |
| Settlement Transactions = 0 | ✓ |
| Paid Checks = 0 | ✓ |
| Tax = 0 | ✓ |
| Dashboard financial KPIs zero (via Reporting DTOs) | ✓ |
| Charts empty (no paid SR facts) | ✓ |
| Reporting exports zero-valued (same DTOs) | ✓ |
| Operational configuration preserved | ✓ |
| Database integrity preserved | ✓ |

---

## Final Verdict

**ZERO EPOCH RESTORED**
