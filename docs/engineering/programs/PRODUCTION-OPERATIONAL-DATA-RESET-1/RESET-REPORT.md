# PRODUCTION-OPERATIONAL-DATA-RESET-1 — Production Readiness Report

**Status:** Complete — **PASS**  
**Date:** 2026-07-19  
**Target:** Production TiDB `gateway01` / database `mineuqr`  
**Type:** Controlled operational data reset (not schema migration)

**Tool:** `scripts/production-operational-data-reset.mjs`  
**Confirm:** `PRODUCTION_OPERATIONAL_RESET_CONFIRM=YES`  

---

## 1. Tables Cleared

| Table | Rows removed |
|-------|-------------:|
| `check_settlement_transactions` | 14 |
| `check_order_membership` | 19 |
| `customer_push_subscriptions` | 0 |
| `order_items` | 477 |
| `print_job_attempts` | 435 |
| `print_job_history` | 435 |
| `print_jobs` | 96 |
| `table_events` | 530 |
| `order_read_order_line_items` | 477 |
| `order_read_order_timeline` | 422 |
| `order_read_public_order_status` | 290 |
| `order_read_operational_kpi_daily` | 34 |
| `order_read_analytics_daily` | 34 |
| `order_read_orders` | 299 |
| `order_read_backfill_runs` | 15 |
| `order_domain_consumer_processed` | 4610 |
| `order_domain_outbox` | 712 |
| `orders` | 299 |
| `operational_checks` | 19 |
| `dining_sessions` | 129 |
| `order_business_day_sequences` | 39 |
| `auth_tokens` | 5 |
| `connector_pairing_tokens` | 165 |
| `renewal_notifications` | 396 |

**Method:** `DELETE FROM <table>` only. No `DROP`, no truncate of config, no migration changes.

---

## 2. Records Removed

| Category | Approx. rows |
|----------|-------------:|
| Orders + lines | 776 |
| Sessions / checks / membership / settlements | 181 |
| Order Read projections + rollups | 1,571 |
| Domain outbox / consumer dedupe | 5,322 |
| Print queue/history | 966 |
| Table events | 530 |
| Ephemeral tokens / notifications | 566 |
| **Total operational rows cleared** | **~9,912** |

---

## 3. Tables Preserved

| Table | Count after |
|-------|------------:|
| `users` | 3 |
| `restaurants` | 6 |
| `categories` | 6 |
| `menu_items` | 11 |
| `offers` | 2 |
| `restaurant_tables` | 25 |
| `restaurant_holidays` | 0 |
| `subscription_plans` | 3 |
| `user_subscriptions` | 5 |
| `invoices` | 5 |
| `payments` | 5 *(SaaS billing — not Order Sales)* |
| `transactions` | 6 *(SaaS billing)* |
| `email_logs` | 4 *(SaaS billing email)* |
| `subscription_history` | 2 *(SaaS billing)* |
| `countries_currencies` | 22 |
| `print_connector_selections` | 1 |
| `restaurant_printers` | 1 |
| `connector_enrollments` | 0 |
| `connector_published_releases` | 3 |
| `operational_devices` | 3 |
| `operational_device_tokens` | 53 |
| `audit_events` | 1495 |
| `__drizzle_migrations` | 76 |

**Preserve drift vs pre-reset:** none.

---

## 4. Validation Report

| Check | Result |
|-------|--------|
| All cleared tables at 0 | **PASS** |
| Config tables unchanged | **PASS** |
| No DROP / schema change | **PASS** |
| Migration journal unchanged (76 rows) | **PASS** |
| Extra live tables audited (`payments`, `transactions`, …) | Preserved as SaaS commercial |

---

## 5. Foreign Key Validation

| Check | Result |
|-------|--------|
| Enforced FK constraints in DB | **0** (MineuQR uses logical FKs) |
| Post-delete orphan operational parents | N/A — operational graphs emptied |
| Config FKs (logical) | Intact (menus, tables, devices unchanged) |

---

## 6. Reporting Validation

| Projection / rollup | Count |
|---------------------|------:|
| `order_read_orders` | 0 |
| `order_read_order_line_items` | 0 |
| `order_read_order_timeline` | 0 |
| `order_read_public_order_status` | 0 |
| `order_read_analytics_daily` | 0 |
| `order_read_operational_kpi_daily` | 0 |
| `order_read_backfill_runs` | 0 |

Reporting history is empty. Dashboards that read these projections will show zero until live orders accrue.

---

## 7. Financial Validation (restaurant operations)

| Metric | Count / state |
|--------|----------------|
| Orders | **0** |
| Order Sales (write + read) | **0** |
| Checks | **0** |
| Settlement transactions | **0** |
| Check membership | **0** |
| Business-day display sequences | **0** (next order allocates **#1**) |
| SaaS subscription `payments` / `transactions` | Preserved (commercial platform billing — not Order Sales) |

---

## 8. Operational Validation

| Surface | Status |
|---------|--------|
| Menu / categories / items | Preserved |
| Tables / QR floor | Preserved |
| Operational devices + tokens | Preserved (screens remain paired) |
| Printers | Preserved |
| Users / auth accounts | Preserved (`auth_tokens` cleared — session cookies may need re-login) |
| Schema / migrations | Unchanged |
| Live UI smoke (Dashboard / Kitchen / Waiter / Kiosk) | **Operator confirm after deploy** — DB state is launch-clean |

---

## 9. Remaining Record Counts (operational = 0)

All operational tables listed in §1 are **0**.  
`order_business_day_sequences` = **0** → first live order becomes display **#1** for its business day / identity scope.

---

## 10. Production Readiness Report

| Criterion | Met |
|-----------|-----|
| No operational restaurant history | Yes |
| Configuration intact for immediate launch | Yes |
| First customer order starts clean history | Yes (sequences cleared) |
| No schema / migration change | Yes |
| Devices remain provisioned | Yes |
| Restaurant Order Revenue / Sales / Checks / Settlements / Reporting = empty | Yes |

**Verdict: GO — production database is launch-clean for restaurant operations.**

### Operator notes

1. Users may need to re-authenticate if relying on cleared `auth_tokens` (password-reset / verify hashes only; password hashes in `users` untouched).
2. SaaS billing tables (`payments`, `transactions`, invoices, subscriptions) were **intentionally preserved**.
3. Re-run tool dry-run anytime: `node scripts/production-operational-data-reset.mjs --dry-run`
4. Confirm UI: Dashboard zeros → place Order #1 → Kitchen/Waiter/Kiosk receive it.
