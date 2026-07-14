# OPERATIONAL-SESSION-PLATFORM-1 — Implementation
## Certification Report

**Program:** OPERATIONAL-SESSION-PLATFORM-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

Operational Session Platform introduced as the universal session abstraction. Dining Session remains the production **table** specialization (no global rename, no schema redesign). Order-attach resolution goes through `resolveOperationalSession` with a table adapter that delegates to `resolveSessionForOrderCreate`. QR behaviour preserved.

**Ownership verdict:** Option B — Operational Session owns Session Identity, Session Anchor, status, lifecycle, and order attachment. Fulfilment Anchor remains Order Identity (not parent of Session). ADR-ARCH-019 upheld.

---

## 2. Architecture audit / root cause

See `ARCHITECTURE.md` §1–3.

Root cause addressed: table-only session resolution treated as universal law. Platform now keys resolution by typed Session Anchor; only `table` is activated.

---

## 3. Fulfilment Anchor ownership answer

| Option | Verdict |
|--------|---------|
| A — Fulfilment Anchor → Operational Session | **Rejected** as canonical ownership |
| B — Operational Session owns Session Anchor + lifecycle | **Accepted** |

Justification: Order stamps Fulfilment Anchor independently; session is optional for several Service Modes; Order and Session status machines are separate. Session Anchor correlates with Fulfilment Anchor on the table path but ownership must not collapse. Full evidence in `ARCHITECTURE.md` §3.

---

## 4. Files changed

| File | Change |
|------|--------|
| `shared/operational-session/operationalSessionContract.ts` | **New** — model, anchors, uniqueness, helpers |
| `shared/operational-session/index.ts` | **New** exports |
| `server/operational-session/*` | **New** resolve, table adapter, map, lifecycle, errors |
| `server/routers.ts` | `order.create` → `resolveOperationalSession` + table anchor |
| `server/diningSession/mapSessionErrorToTrpc.ts` | Map platform validation / not-activated errors |
| `shared/ordering-platform/orderingIdentityContract.ts` | Session pointer notes + `anchorType: "table"` |
| Tests + program docs + ADR-019 / registry | Validation + certification |

---

## 5. QR compatibility verification

| Check | Result |
|-------|--------|
| No route / UX / BI changes | ✓ |
| Table uniqueness via Dining Session | ✓ |
| Dual-write flag gating unchanged | ✓ |
| Adapter calls `resolveSessionForOrderCreate` identically | ✓ |
| Non-table anchors not activated | ✓ |
| `dining_sessions` schema unchanged | ✓ |

---

## 6. Test summary

| Suite | Result |
|-------|--------|
| `operationalSessionContract.test.ts` | Pass |
| `operationalSession.architecture.guards.test.ts` | Pass |
| `resolveOperationalSession.test.ts` | Pass |
| Related dual-write / identity tests | Pass |

---

## 7. Build result

`npm run build` — **PASS** (vite client + esbuild server / vercel handler).

---

## 8. Documentation summary

| Doc | Content |
|-----|---------|
| `ARCHITECTURE.md` | Audit, Option B decision, lifecycle, anchors |
| `IMPLEMENTATION.md` | This certification |
| ADR-ARCH-019 | Session platform progress |

---

## 9. Certification report

| Criterion | Status |
|-----------|--------|
| Ownership map complete before implementation | ✓ |
| Option B documented with evidence | ✓ |
| Operational Session + Session Anchor contracts | ✓ |
| `resolveOperationalSession` + table adapter | ✓ |
| Lifecycle facade (channel-independent) | ✓ |
| Dining Session specialization preserved | ✓ |
| QR behavioural compatibility | ✓ |
| No non-table activation / no DB redesign | ✓ |

**OPERATIONAL-SESSION-PLATFORM-1 is CERTIFIED.**

Follow-ons (separate programs): non-table PlaceOrder + session activation, ops fulfilment label, kiosk identity adoption.
