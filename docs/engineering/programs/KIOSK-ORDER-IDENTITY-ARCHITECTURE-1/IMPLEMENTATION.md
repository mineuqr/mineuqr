# KIOSK-ORDER-IDENTITY-ARCHITECTURE-1 — Implementation
## Phase C — Certification Report (Architecture Design)

**Program:** KIOSK-ORDER-IDENTITY-ARCHITECTURE-1  
**Type:** Architecture Design (no production code)  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

KIOSK-ORDER-IDENTITY-ARCHITECTURE-1 establishes the official **platform-wide Order Identity** model for MineuQR. Physical table is no longer the universal PlaceOrder owner. Orders carry **Service Mode** + **Fulfilment Anchor**; **Operational Session** generalizes table-only dining sessions with typed uniqueness. Channels remain experience-only. No schema, PlaceOrder, Session, BI, or UI code was changed.

---

## 2. Architecture audit (deliverable)

Complete forensic audit is in `ARCHITECTURE.md` §2.

**Headline findings:**

- Write path requires real `restaurant_tables` row; client `tableId` is ignored after lookup  
- DiningSession is table-scoped with one-open-per-table uniqueness  
- Kitchen / Expo / Print primarily need a **label** (`tableNumber`); Kitchen already hints at takeaway  
- Business Identity is orthogonal  
- Kiosk `?table=` is a **convenience workaround** forced by PlaceOrder shape  

---

## 3. Root cause analysis

Three concepts were collapsed into `tableId`:

1. Occupancy anchor (dining session)  
2. Fulfilment label (ops display)  
3. PlaceOrder eligibility key  

That collapse is correct for QR table service and invalid as a universal law for kiosk/counter/pickup/drive-thru.

---

## 4. Current vs proposed identity model

| | Current | Proposed |
|--|---------|----------|
| PlaceOrder owner | Implicit table | Fulfilment Anchor + Service Mode |
| Session | DiningSession (table only) | Operational Session (typed anchor) |
| Ops label | `tableNumber` | `fulfilmentLabel` (table number when table) |
| Channel | Forced table-shaped command | Supplies facts; platform validates |

---

## 5. Ownership model

| Concern | Owner |
|---------|--------|
| Order lifecycle / money / notes | Order Domain |
| Service Mode enum + policies | Ordering Platform |
| Fulfilment Anchor types + label derivation | Ordering Platform |
| Operational Session uniqueness per anchor | Session Platform (generalized) |
| Channel shells / device session UX | Channels |
| Business Identity | BI (unchanged) |
| Kitchen / Expo / Print consumption | Operational Platform (label consumers) |

---

## 6. Service mode analysis

Service Mode is **Order-stamped** (immutable at place). Not channel-owned. Not session-only.  
Closed vocabulary: `table_service`, `counter`, `take_away`, `pickup`, `delivery`, `drive_thru`.  
Mode constrains allowed anchors and whether a session is required (`table_service` → required table session).

---

## 7. Session model

**Operational Session** supersedes table-only thinking while preserving today’s table uniqueness for `anchorType = table`. Station/pickup/queue use weaker or order-scoped policies. Fake virtual tables are forbidden.

---

## 8. Migration strategy

M0 (this) → contracts → PlaceOrder dual-write → session anchors → ops labels → kiosk adoption.  
QR behavioural compatibility required at every step. Details: `ARCHITECTURE.md` §8.

---

## 9. Required ADRs

| ADR | Status |
|-----|--------|
| **ADR-ARCH-019** Order Identity via Service Mode and Fulfilment Anchor | **Proposed** |

Document: `docs/architecture/adrs/ADR-ARCH-019-order-identity-fulfilment-anchor.md`

---

## 10. Risks

See `ARCHITECTURE.md` §10. Primary risk is over-generalization; mitigated by table-first dual-write migration.

---

## 11. Files changed (documentation only)

| File | Change |
|------|--------|
| `docs/engineering/programs/KIOSK-ORDER-IDENTITY-ARCHITECTURE-1/ARCHITECTURE.md` | **New** binding architecture |
| `docs/engineering/programs/KIOSK-ORDER-IDENTITY-ARCHITECTURE-1/IMPLEMENTATION.md` | **New** this report |
| `docs/architecture/adrs/ADR-ARCH-019-order-identity-fulfilment-anchor.md` | **New** Proposed ADR |
| `docs/architecture/constitution/ADR-Registry.md` | Register ADR-ARCH-019 |

**Not modified:** Schema, PlaceOrder, Session, BI, Kiosk UI, Kitchen, Print, Runtime code.

---

## 12. Certification report

| Criterion | Status |
|-----------|--------|
| Complete architecture audit | ✓ |
| Root cause identified | ✓ |
| Platform-wide identity (no channel exceptions) | ✓ |
| Service mode + session model decided | ✓ |
| Migration preserves QR / BI / ops compatibility | ✓ |
| ADR produced | ✓ |
| No production code / schema changes | ✓ |
| Scope creep avoided | ✓ |

---

**KIOSK-ORDER-IDENTITY-ARCHITECTURE-1 is CERTIFIED as the official architectural foundation for every non-table Ordering Channel in MineuQR.**

Implementation must not begin until ADR-ARCH-019 is accepted by Architecture Authority and a follow-on implementation program is approved.
