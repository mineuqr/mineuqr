# RISKS AND BLOCKERS

## Critical blockers (must stop implementation)

**NONE** for Phase 1 domain foundation, provided implementation:

- does not reuse `operational_devices` as POS Terminal
- does not reuse `crmp_registers` as POS Terminal
- does not create POS money aggregates
- does not run Production migrate/seed in the foundation program without a separate apply

## Non-blocking risks

1. **POS-PLATFORM-ARCHITECTURE-1 package absent** from `docs/` — implementation must not invent a second architecture.
2. **`devices` / `mobile_pos` naming** — easy to conflate with POS Terminal.
3. **Orphan limit keys** — adding `posTerminals` incorrectly as filter-only (like `devices` limit) would not enforce. Must wire `LIVE_PLAN_LIMIT_KEYS` or `readLimitValue`.
4. **Fail-closed quantity** — deploying runtime before seeding included quantity would block all provisioning. Same class of cutover as capability gating.
5. **Check header has no `version`** — POS Check OCC contract cannot be fully executed until Check platform adds header CAS (future).
6. **RBAC unimplemented** — cashier vs owner permissions are coarse until a RBAC program.
7. **`order.settlePaid` is public** — must not be treated as POS authorization.
8. **Journal terminus 0090** — any new table is a later apply; Vercel deploy does not migrate.
9. **Channel `cashier_pos` missing** — inventing stamps outside the registry would break governance.
10. **Dormant “cashier” UI copy** (kiosk confirmation) — presentation only; not a conflicting POS app.

## Production / git

HEAD at investigation time included `4278bdb3` (plan capability gating). Recent history is commercial, not POS. No dormant POS tables or routes found.

PRODUCTION MUTATION for this program: **0** (read-only).
