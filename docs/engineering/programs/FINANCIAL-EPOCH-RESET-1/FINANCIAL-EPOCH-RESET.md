# FINANCIAL-EPOCH-RESET-1 — Production Financial Epoch Reset

| Field | Value |
|---|---|
| **Program** | FINANCIAL-EPOCH-RESET-1 |
| **Phase** | Production Financial Reset (P0) |
| **Date** | 2026-07-23 |
| **Target** | Production TiDB `gateway01.eu-central-1.prod.aws.tidbcloud.com` / `mineuqr` |
| **Constitutional ADR** | [ADR-ARCH-026 — Settlement Record Platform](../../../architecture/adrs/ADR-ARCH-026-settlement-record-platform.md) |
| **References** | SETTLEMENT-RECORD-IMPLEMENTATION-1 · SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1 · PRODUCTION-MIGRATION-EXECUTION-0076 · SETTLEMENT-RECORD-REPORTING-ADOPTION-1 |
| **Verdict** | **FINANCIAL EPOCH RESET CERTIFIED** |

---

## Executive Summary

Production restaurant financial history was reset to **Financial Epoch Zero**, then validated by creating the **first official Settlement Record** via a controlled smoke payment.

- Experimental / QA / UAT financial data removed (**503 rows** across 34 clear tables).
- Operational configuration preserved (restaurants, users, menus, tables, devices, tax/business settings, SaaS billing, migrations).
- No schema changes. No architecture / Check / Settlement Record / Reporting code changes required for the wipe itself.
- Tooling: `scripts/financial-epoch-reset.mjs` (backup + delete + probes) and `scripts/financial-epoch-smoke.mts` (first official payment).

After Epoch Zero probes passed, smoke established Epoch Start:

| Metric | Epoch Zero (post-delete) | After smoke (Epoch Start) |
|--------|--------------------------:|--------------------------:|
| Settlement Records | 0 | **1** (`sr:720007:330001:settlement:1`) |
| Revenue (Reporting) | 0.00 | **24.00** |
| Tax Collected | 0.00 | **3.13** |
| Captured tenders | 0 | **1** (cash) |
| Paid Checks | 0 | **1** |

No historical financial backfill will be performed. Commercial history begins at this Epoch.

---

## Business Justification

Production contained only development, QA, internal testing, and UAT financial activity — **no real customer financial records**.

Preserving that history would contaminate Settlement Record–based Reporting (ADR-ARCH-026) and commercial KPIs.

**Decision:** Historical financial data SHALL NOT be preserved. Settlement Record history begins at Financial Epoch Zero; the first post-reset paid finalize is the official start of financial history.

---

## Backup Verification

| Control | Evidence |
|---------|----------|
| TiDB Cloud continuous backup | Same platform control as certified `0076` migrate |
| Pre-delete JSON dump | `artifacts/financial-epoch-reset-1/2026-07-23T19-42-00-512Z/` (gitignored) |
| Manifest | `MANIFEST.json` with host, database, per-table row counts + dump paths |
| Confirm gate | `FINANCIAL_EPOCH_RESET_CONFIRM=YES` required for `--execute` |
| Dry-run first | Completed successfully before execute |

**Rollback plan:** Restore deleted rows from the JSON dumps (INSERT per table in reverse deletion order) **or** restore from TiDB Cloud backup point prior to `2026-07-23T19:42:00Z`. Schema / migrations unchanged — rollback is data-only.

---

## Tables Affected

### Cleared (financial + continuity + projections)

Settlement Record · MCA (6) · Split payments (5) · Settlement Transactions · Order Settlements · Check Membership · Operational Checks · Sessions · Orders / items · Print jobs · Table events · Order domain outbox/consumer · Business-day sequences · Order Read projections / rollups / backfill runs.

### Preserved (configuration)

`users`, `restaurants` (incl. live tax settings), `categories`, `menu_items`, `offers`, `restaurant_tables`, `restaurant_holidays`, `subscription_plans`, `user_subscriptions`, `invoices`, SaaS `payments` / `transactions` / `email_logs` / `subscription_history`, `countries_currencies`, printers / connectors / devices / device tokens, `audit_events`, `__drizzle_migrations`.

---

## Row Counts Before Reset

| Table | Rows |
|-------|-----:|
| `settlement_records` | 0 |
| `check_settlement_transactions` | 4 |
| `check_order_settlements` | 2 |
| `check_order_membership` | 4 |
| `operational_checks` | 4 |
| `dining_sessions` | 4 |
| `orders` / `order_items` | 5 / 5 |
| Print jobs / attempts / history | 5 / 26 / 26 |
| `table_events` | 16 |
| Order domain outbox / consumer | 45 / 307 |
| Order Read projections (all) | 45 |
| MCA / split payment tables | 0 |
| **Total cleared** | **503** |

### Config before (must stay stable)

| Table | Count |
|-------|------:|
| `restaurants` | 6 |
| `users` | 3 |
| `menu_items` | 11 |
| `restaurant_tables` | 25 |
| `categories` | 6 |
| `operational_devices` | 2 |
| `__drizzle_migrations` | 81 |

---

## Reset Execution

| Step | Result |
|------|--------|
| Dry-run | **PASS** — 34 tables present, 503 rows planned |
| Backup dumps | **PASS** — non-empty clear tables dumped under `artifacts/.../2026-07-23T19-42-00-512Z` |
| Execute `DELETE` (FK checks off → on) | **PASS** |
| Tool verdict | **PASS** (`nonZeroClearRemaining=[]`, `preserveDrift={}`) |

### Execution order (summary)

1. `settlement_records`
2. MCA children → `multi_check_allocations`
3. Split-payment children → `check_split_payments`
4. `check_settlement_transactions` → `check_order_settlements` → `check_order_membership`
5. `operational_checks`
6. Print / table events / order items / outbox / `orders` / `dining_sessions` / sequences
7. Order Read projections + backfill runs

Command:

```bash
node scripts/financial-epoch-reset.mjs --dry-run
FINANCIAL_EPOCH_RESET_CONFIRM=YES node scripts/financial-epoch-reset.mjs --execute
```

---

## Row Counts After Reset (Epoch Zero)

All clear tables: **0**.

Financial zero probes:

| Probe | Value |
|-------|------:|
| `settlement_records` | 0 |
| `check_settlement_transactions` | 0 |
| `operational_checks` | 0 |
| `check_order_settlements` | 0 |
| Revenue (SUM paid SR grandTotal) | 0.00 |
| Tax Collected | 0.00 |
| Payment Totals (captured ST) | 0.00 |
| `order_read_analytics_daily` | 0 |

Config after: **identical** to before (preserve drift none). Migrations still **81**.

---

## Referential Integrity Validation

| Check | Result |
|-------|--------|
| Enforced DB FKs on financial tables | None (logical IDs — by design) |
| Cleared tables empty | **PASS** |
| Config tables unchanged | **PASS** |
| No orphan financial parents | **PASS** (Checks / ST / SR / OS / MCA / split all 0) |
| Schema / `__drizzle_migrations` | Unchanged |

---

## Smoke Tests

Tool: `FINANCIAL_EPOCH_SMOKE_CONFIRM=YES pnpm exec tsx scripts/financial-epoch-smoke.mts`

| Step | Result |
|------|--------|
| Create Session (table 1 / restaurant 720007) | **PASS** — session `2280001`, check `330001` |
| Create Order(s) via IdentityPlaceOrder | **PASS** — orders placed; business day `#1+` |
| Sync Check membership / money | **PASS** — grandTotal `24.00` |
| Receive Payment / Mark Paid (cash) | **PASS** |
| Finalize Check | **PASS** — outcome `paid` |
| Settlement Record Created | **PASS** — `sr:720007:330001:settlement:1` gen=1 |
| Dashboard / Reporting Revenue Updated | **PASS** — `getBusinessMetricsSummary` revenue `24.00`, tax `3.13`, paidCheckCount `1` |
| Payment Analytics Updated | **PASS** — cash tender total `24.00` |

**Smoke verdict: `SMOKE_PASS`**

This payment is the official beginning of production financial history.

---

## Reporting Validation

| Surface | Epoch Zero | After first Settlement Record |
|---------|------------|-------------------------------|
| Revenue (Business Metrics / Dashboard API) | 0.00 | 24.00 |
| Tax Collected | 0.00 | 3.13 |
| Average Check | 0.00 | 24.00 |
| Payment Analytics | empty | cash |
| Settlement Records | 0 | 1 |
| Excel / PDF | consume same DTOs — begin from post-reset SR facts | same |
| Order Sales rollups | 0 at Epoch Zero | rebuild from live orders going forward |

Canonical financial source remains Settlement Record (SETTLEMENT-RECORD-REPORTING-ADOPTION-1). No Reporting code changes in this program.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Accidental wipe of config | Preserve list + post-count drift check (none) |
| Need to undo wipe | Local JSON backup + TiDB Cloud continuous backup |
| Smoke left non-zero finance | Intentional — Epoch Start evidence; not test pollution to backfill |
| Table PlaceOrder membership lag in scripted smoke | Smoke forces `createOpenCheckForSession` sync before Mark Paid |
| Auth / ephemeral tokens | Not cleared in epoch script (narrower than prior ops reset) |

---

## Final Certification

| Success criterion | Status |
|-------------------|--------|
| Experimental financial records removed | ✓ |
| Settlement Records at Epoch Zero = 0 | ✓ |
| Settlement Transactions at Epoch Zero = 0 | ✓ |
| Paid financial history removed | ✓ |
| Financial reports zero at Epoch Zero | ✓ |
| Operational configuration preserved | ✓ |
| Database integrity preserved | ✓ |
| First new payment creates first official Settlement Record | ✓ (`sr:720007:330001:settlement:1`) |
| Production ready for commercial launch | ✓ |

### Tooling delivered

- `scripts/financial-epoch-reset.mjs` — dry-run / backup / execute / financial probes  
- `scripts/financial-epoch-smoke.mts` — Order → Check → Paid → SR → Reporting  
- `scripts/financial-epoch-postvalidate.mjs` — zero / config probes  
- `scripts/production-operational-data-reset.mjs` — CLEAR list aligned with SR / MCA / split tables  

---

## Final Verdict

**FINANCIAL EPOCH RESET CERTIFIED**
