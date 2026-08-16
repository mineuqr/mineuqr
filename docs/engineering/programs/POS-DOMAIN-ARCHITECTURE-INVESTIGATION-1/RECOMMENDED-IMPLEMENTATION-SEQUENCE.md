# RECOMMENDED IMPLEMENTATION SEQUENCE

Evidence changes the default list in one way: **commercial quantity contract and channel registration must precede terminal persistence**, because provisioning is meaningless without an authoritative included quantity, and PlaceOrder must not invent a channel.

Recommended order for `POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1`:

1. **POS domain contract + invariants + ADRs (program-local, no conflicting ARCH numbers)**
2. **Commercial integration contract** — Effective POS Entitlement over `checkLimit` / live-plan limit values; document seed/cutover as a later apply (do not invent packaging)
3. **Register `cashier_pos` as `registered`** in Ordering Channel Registry (not reporting-visible yet)
4. **POS Terminal model + lifecycle + tenant binding** (new domain; in-memory + prepared migration, no Production apply in foundation unless separately authorized)
5. **Provisioning invariant** — active/registered count ≤ included quantity; server-side
6. **Cashier / access context types** — Business + Terminal + User + Permission + Operation (no UI)
7. **Authorization foundation** — permission key catalog + `assertRestaurantAccess` + entitlement + terminal state; no new RBAC tables
8. **Boundaries only** — Order, Session, Check, Settlement, Register, Reporting, Country, Offline, Concurrency/Idempotency contracts and **guard tests** (fail if POS writes money or reuses device/register as terminal)
9. **Local certification** — targeted tests, `pnpm build`, document `pnpm check` pre-existing

Do **not** in Phase 1: cashier UI, direct sale, settle, split/refund, Register, ZATCA, offline finance, POS add-on billing.

Next after certification: `POS-TERMINAL-ACCESS-IMPLEMENTATION-1` (durable access + provisioning UX), then sale/settlement phases that **call** Order/Check/CRMP.
