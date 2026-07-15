# OPERATIONAL-SCREEN-CATALOG-POLICY-1 — Migration Certification Report

**Program:** OPERATIONAL-SCREEN-CATALOG-POLICY-1  
**Migration:** `0067_operational_device_waiter_display` (waiter screen role)  
**Date:** 2026-07-15  
**Decision:** **CERTIFIED — PRODUCTION READY**

---

## 0. Pre-certification forensics

Gate 1 initially **failed**: SQL `drizzle/0067_operational_device_waiter_display.sql` existed on disk but was **outside** `drizzle/meta/_journal.json` (canonical terminus was still `0066`).

Remediation (official lineage extension only — no history rewrite, no manual SQL on DB):

1. Journalized tag `0067_operational_device_waiter_display` (idx 67)
2. Advanced `CANONICAL_MIGRATION_TAIL_TAG` / count to **68**
3. Extended `db:verify-schema` for `operational_devices.role` enum member `waiter_display`

Forensic record: `MIGRATION-FORENSICS-0067-GOVERNANCE-BLOCK.md`

---

## 1. Migration executed

| Item | Value |
|------|--------|
| Tag | `0067_operational_device_waiter_display` |
| SQL | `drizzle/0067_operational_device_waiter_display.sql` |
| Change | Additive `ALTER TABLE … MODIFY COLUMN role enum(…, 'waiter_display')` |
| Workflow | Official Drizzle journal migrate (`pnpm db:migrate`) |
| Manual SQL | **Not used** |
| Result | Applied successfully |

---

## 2. Commands executed

```bash
pnpm db:governance-check
pnpm db:preflight          # pending: 0067_operational_device_waiter_display
pnpm db:migrate
pnpm db:preflight          # no pending; hashes synchronized
pnpm db:verify-schema
pnpm db:governance-check
# Read-only integrity probe (operational_devices roles / enum)
pnpm exec vitest run <catalog + provisioning + waiter + device-mgmt suite>
pnpm exec vite build
```

---

## 3. Governance result

| Check | Result |
|-------|--------|
| `pnpm db:governance-check` (pre) | **PASS** after journalize |
| Journal entries | **68** |
| Last journal tag | `0067_operational_device_waiter_display` |
| Non-legacy orphans | **None** |
| `pnpm db:governance-check` (post) | **PASS** |

---

## 4. Migration journal verification

| Check | Result |
|-------|--------|
| Preflight before migrate | Pending: `0067_operational_device_waiter_display` only |
| Preflight after migrate | **All journal migration hashes recorded in DB** |
| `__drizzle_migrations` rows | **72** (68 journal + historical bootstrap extras retained) |
| Pending migrations after apply | **None** |

---

## 5. Schema verification

`pnpm db:verify-schema` — **OK** (auth, order-read, operational-device, fulfilment, business-identity-scope, **waiter_display**).

Live `operational_devices.role` COLUMN_TYPE:

```text
enum('kitchen_display','expo_display','pickup_display','customer_display','print_monitor','self_ordering_kiosk','waiter_display')
```

| Expectation | Status |
|-------------|--------|
| `waiter_display` present | **Yes** |
| Kitchen / kiosk / hidden roles retained in enum | **Yes** |
| Schema drift vs verify-schema required set | **None** |

---

## 6. Integrity verification (read-only)

| Metric | Value |
|--------|--------|
| Total `operational_devices` | **3** |
| Total `operational_device_tokens` | **45** |
| Devices by role | kitchen_display **1**, expo_display **1**, self_ordering_kiosk **1** |
| Kitchen screens | Unaffected (row preserved) |
| Self Ordering Kiosk screens | Unaffected (row preserved) |
| Waiter role available for provisioning | **Yes** (enum member present; zero waiter rows yet — expected) |
| Hidden roles still in enum | expo / pickup / customer_display / print_monitor **present** |
| Data loss | **None** — device + token counts and existing role assignments preserved |

---

## 7. Architecture / test results

Suite (provisioning, runtime roles, catalog policy, device management, pairing, waiter foundation/binding, navigation adoption):

| Result | Count |
|--------|--------|
| Test files | **13 passed** |
| Tests | **77 passed** |

Notable coverage:

- `operationalScreenCatalogPolicy.architecture.guards` — visible catalog = kitchen / waiter / kiosk
- `runtimeRoleRegistry` — `waiter_display` operational + `supportsWaiterOrdering`
- Screen provisioning workspace / navigation
- Device management + order execution + pairing
- Waiter ordering / session binding guards
- Migration governance regression (terminus **0067**, count **68**)

---

## 8. Production build

| Gate | Result |
|------|--------|
| `pnpm exec vite build` | **PASS** (built in ~1m 11s) |

---

## 9. Production readiness

**READY.** Migration `0067` is journaled, applied via official `pnpm db:migrate`, schema-verified (`waiter_display` on `operational_devices.role`), and integrity-checked with existing provisioning data preserved. Kitchen and kiosk screens remain valid; waiter screen role is available for Device Management / provisioning.

---

## 10. Final certification

**CERTIFIED** — `0067_operational_device_waiter_display` production migration governance complete. Safe to create the final OPERATIONAL-SCREEN-CATALOG-POLICY-1 commit.
