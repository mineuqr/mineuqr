# ADR-ARCH-019: Order Identity via Service Mode and Fulfilment Anchor

> [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | KIOSK-ORDER-IDENTITY-ARCHITECTURE-1 |
| **Date** | 2026-07-14 |
| **Supersedes** | — |
| **Refines** | Order-Centric `TableReference` exclusivity; PlaceOrder table-only command shape |
| **Implementation status** | Partial — runtime + session + PlaceOrder + Kiosk + Order Read fulfilment projection delivered; ops UI label adoption pending |

---

## Context

Production PlaceOrder and DiningSession treat **physical table** as mandatory order identity. That fits QR / waiter table service. It does not fit kiosk, counter, take-away, food court, pickup, or drive-thru.

SELF-ORDERING-KIOSK-PLATFORM-1 documented the forced `?table=` binding as an architectural gap, not a channel bug. Kitchen presentation already anticipates non-table labels (`tableNumber <= 0` → takeaway), while the write path cannot produce such orders.

Encoding every channel as a fake `restaurant_tables` row would corrupt occupancy KPIs and create channel-specific master-data exceptions — violating Platform Before Channels and SSOT.

---

## Decision

1. **Order** remains the Core Domain aggregate (ADR-ARCH-001).

2. Every placed Order SHALL carry:
   - **Service Mode** — closed platform enum (`table_service`, `counter`, `take_away`, `pickup`, `delivery`, `drive_thru`, …)
   - **Fulfilment Anchor** — discriminated platform union (`table`, `station`, `pickup_point`, `queue`, `drive_lane`, …) with a derived **fulfilment label** for ops

3. **Operational Session** SHALL be generalized from table-only DiningSession: keyed by **Session Anchor** type with type-specific uniqueness. Table occupancy rules (`one open session per table`) are preserved for `anchorType = table`.

4. **Ownership refinement (OPERATIONAL-SESSION-PLATFORM-1):** Operational Session owns Session Identity, Session Anchor, status, and lifecycle. **Fulfilment Anchor remains Order Identity** — not the parent aggregate of Operational Session (Option B).

5. **PlaceOrder activation (NON-TABLE-PLACE-ORDER-1):** PlaceOrder is **identity-driven**. Table is one Fulfilment Anchor type. Non-table anchors use the same model via `IdentityPlaceOrderService` + `resolveOperationalSession` (ephemeral for non-table). Legacy NOT NULL `orders.tableId`/`tableNumber` dual-write uses real table fields for table anchors and platform **LEGACY_NON_TABLE** sentinels (`0`/`0`) for non-table — not fake `restaurant_tables` rows. QR `order.create` remains the production table path.

6. **Channel** (qr, kiosk, waiter_tablet, …) is provenance / experience only. Channels MUST NOT own Service Mode definitions or invent Fulfilment / Session Anchor types.

7. **Business Identity** remains orthogonal (day/display sequence) and MUST NOT absorb location.

8. Migration SHALL be additive. Dining Session remains the table specialization — not a global rename.

Normative detail: `docs/engineering/programs/KIOSK-ORDER-IDENTITY-ARCHITECTURE-1/ARCHITECTURE.md`.  
Runtime: `docs/engineering/programs/ORDER-IDENTITY-RUNTIME-1/ARCHITECTURE.md`.  
Session: `docs/engineering/programs/OPERATIONAL-SESSION-PLATFORM-1/ARCHITECTURE.md`.  
PlaceOrder: `docs/engineering/programs/NON-TABLE-PLACE-ORDER-1/ARCHITECTURE.md`.

---

## Consequences

### Positive

- One identity model for all Ordering Channels  
- Removes need for fake tables / `?table=` workarounds at the PlaceOrder layer  
- Preserves table occupancy where it is operationally real  
- Clear split: Fulfilment Anchor (Order) vs Session Anchor (Session)

### Negative / costs

- Temporary LEGACY_NON_TABLE sentinels until nullable table columns migration  
- Ops label / channel UI programs still required  
- Ops UI must stop assuming “table” is the only label  

---

## Related Programs

- KIOSK-ORDER-IDENTITY-ARCHITECTURE-1  
- **ORDER-IDENTITY-RUNTIME-1** (delivered)  
- **OPERATIONAL-SESSION-PLATFORM-1** (delivered)  
- **NON-TABLE-PLACE-ORDER-1** (delivered — platform capability)  
- **KIOSK-IDENTITY-ADOPTION-1** (delivered — first channel adopter; station Fulfilment Anchor)  
- **OPERATIONAL-FULFILMENT-PROJECTION-1** (delivered — Order Read Model / Operational DTO fulfilment fields)  
- SELF-ORDERING-KIOSK-PLATFORM-1  
- Suggested follow-ons: OPS UI preference for `fulfilmentLabel`, nullable table dual-write retirement  

---

## Related ADRs

| ADR | Relationship |
|-----|----------------|
| ADR-ARCH-001 | Order remains core; identity is reference data on Order |
| ADR-ARCH-002 | SSOT — one fulfilment meaning platform-wide |
| ADR-ARCH-007 | Aggregate gains mode/anchor fields via controlled evolution |
| ADR-ARCH-010 | Session integration remains event-driven; session key generalizes |
| ADR-ARCH-018 | Client Platform submits mode/anchor; does not invent them |

---

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Keep table-only PlaceOrder; fake tables per kiosk | Corrupts occupancy; channel-specific master data |
| Channel-specific PlaceOrder services | Violates Platform Before Channels |
| Session-only identity without Order-stamped mode/anchor | Orders need immutable fulfilment semantic after session ends |
| Fulfilment Anchor as parent of Operational Session (Option A) | Cannot express optional sessions; collapses Order Identity into Session |
| Virtual always-on “counter table” | Historical workaround, not a model |
| Global DiningSession rename | Breaks compatibility; specialization preferred |

---

## Acceptance criteria (when Implemented)

- [x] Shared Service Mode + Fulfilment Anchor contracts exist (ORDER-IDENTITY-RUNTIME-1)  
- [x] Runtime projects identity policies; PlaceOrder consumes table identity (ORDER-IDENTITY-RUNTIME-1)  
- [x] Operational Session Platform + typed Session Anchors; table specialization (OPERATIONAL-SESSION-PLATFORM-1)  
- [x] Table service path behaviourally compatible with today’s QR  
- [x] PlaceOrder accepts non-table anchors without channel forks (NON-TABLE-PLACE-ORDER-1)  
- [x] Order Read Model / Operational DTOs project fulfilment label + mode + anchor (OPERATIONAL-FULFILMENT-PROJECTION-1)  
- [x] Ops UI layouts prefer `fulfilmentLabel` over tableNumber heuristics (OPERATIONAL-FULFILMENT-PRESENTATION-1)  
- [x] Kiosk no longer requires `?table=` workaround (KIOSK-IDENTITY-ADOPTION-1)  
- [x] Architecture guards forbid channel-invented PlaceOrder forks  
