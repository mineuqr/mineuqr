# SESSION MANAGEMENT CONTRACT

**Canonical key:** `sessionTableManagement`  
**Display:** Session Management  

## Domain (narrowed)

Dining-session **lifecycle management** for an already-identified table/session.

This capability does **not** own table/QR identity. Tables are QR anchors (`smartQr`). The presentation card historically implied “session + table”; independently toggling Session OFF / QR ON would be contradictory if table CRUD were gated here. **Contract narrows Session to session operations.**

## Classification

| Operation | Procedure | Class |
|-----------|-----------|--------|
| Mark paid | `session.markPaid` | **GATED** |
| Mark complimentary | `session.markComplimentary` | **GATED** |
| Close session | `session.close` | **GATED** |
| Owner timeline | `session.getOwnerTimeline` | **GATED** (management read) |
| Owner workspace | `session.getOwnerWorkspace` | **GATED** (management read) |
| Public active session by table | `session.getActiveByTable` | **NOT GATED** (public / guest) |
| Public session by token | `session.getByToken` | **NOT GATED** (public / guest) |
| Table create / update / delete | `table.*` | **SEPARATE** → `smartQr` |
| Check / order / register / `ordering` | check/order/register routers | **SEPARATE** |
| Session create via guest order flow | order/session open as side effect of ordering | **SEPARATE** (`ordering` + FROZEN) — do not silently absorb |

## Disablement

- GATED operations: deny.
- Existing session rows: **preserved**.
- Public guest session reads: continue (subject to FROZEN / ordering).
- No session DELETE as a gate.

## Quotas

None identified as a substitute for this boolean. Do not invent one.
