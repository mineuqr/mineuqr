# KIOSK-PRESENTATION-ADOPTION-1 — Migration Certification Report

**Program:** KIOSK-PRESENTATION-ADOPTION-1  
**Migration:** `0066_order_business_identity_scope`  
**Date:** 2026-07-15  
**Decision:** **CERTIFIED — PRODUCTION READY**

---

## 1. Migration executed

| Item | Value |
|------|--------|
| Tag | `0066_order_business_identity_scope` |
| SQL | `drizzle/0066_order_business_identity_scope.sql` |
| Workflow | Official Drizzle journal migrate (no manual SQL) |
| Result | Applied successfully |

---

## 2. Commands executed

```bash
pnpm db:governance-check
pnpm db:preflight
pnpm db:migrate
pnpm db:preflight
pnpm db:verify-schema
# Read-only integrity probe (orders / sequences / indexes)
pnpm exec vitest run <business-identity + presentation guards>
pnpm exec vite build
pnpm db:governance-check
```

---

## 3. Migration journal status

| Check | Result |
|-------|--------|
| Journal entries | **67** |
| Last journal tag | `0066_order_business_identity_scope` |
| Preflight before migrate | Pending: `0066` only |
| Preflight after migrate | **All journal migration hashes recorded in DB** |
| `__drizzle_migrations` rows | 71 (67 journal + historical bootstrap extras retained) |
| Governance guard | **OK** |

---

## 4. Schema verification

`pnpm db:verify-schema` — **OK** (auth, order-read, operational-device, fulfilment, business-identity-scope).

Live schema confirms:

| Object | Status |
|--------|--------|
| `orders.identityScope` | Present (`varchar(16)`, nullable) |
| `order_read_orders.identityScope` | Present |
| `order_read_public_order_status.identityScope` | Present |
| `order_business_day_sequences.identity_scope` | Present, NOT NULL |
| Sequence PK | `(restaurant_id, business_day, identity_scope)` |
| Unique index `uq_orders_restaurant_business_day_scope_display` | Present on `(restaurantId, businessDay, identityScope, daily_display_number)` |
| Legacy `uq_orders_restaurant_business_day_display` | Removed |

`scripts/verify-schema-deployment.cjs` updated to enforce these objects going forward.

---

## 5. Validation results (data integrity)

| Metric | Value |
|--------|--------|
| Total orders | **267** |
| Orders with business day + display number | **267** |
| Orders with `identityScope` | **267** |
| Assigned rows missing scope | **0** |
| Backfill scope | **TABLE** (267) / KIOSK (0 — none yet) |
| `order_read_orders` with scope | **267** / missing **0** |
| Sequence rows | 31 rows, all `identity_scope = TABLE` |
| Sample recent orders | Readable; `dailyDisplayNumber` preserved (e.g. 3–7 on 2026-07-14) |

---

## 6. Regression analysis

| Concern | Result |
|---------|--------|
| Channel-scoped allocation supported | **Yes** — schema PK + allocator key include scope |
| Existing Business Identity intact | **Yes** — all prior numbers retained; backfilled as TABLE |
| Data loss | **None** — order count and display numbers intact |
| Existing orders readable | **Yes** |
| Display numbers continue functioning | **Yes** — resolver now formats as `T #NNN` for TABLE scope |
| Ordering Platform ownership | Unchanged |
| Manual SQL / workaround | **Not used** |

---

## 7. Verification gates (post-migrate)

| Gate | Result |
|------|--------|
| `pnpm db:governance-check` | **PASS** |
| `pnpm db:preflight` | **PASS** (no pending) |
| `pnpm db:verify-schema` | **PASS** |
| Business Identity + architecture guards | **55/55 PASS** |
| `vite build` | Recorded in close-out |

---

## 8. Production readiness

**READY.** Migration `0066` is applied, journaled, schema-verified, and data-backfilled. Business Identity allocation can partition by `TABLE` / `KIOSK` per Business Day. Existing table orders remain on the TABLE sequence with preserved daily display numbers.

---

## 9. Final certification

**CERTIFIED** — `0066_order_business_identity_scope` production migration governance complete. Safe to create the final KIOSK-PRESENTATION-ADOPTION-1 commit.
