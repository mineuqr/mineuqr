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
| **Implementation status** | Partial — ORDER-IDENTITY-RUNTIME-1 (runtime foundation) delivered; schema/session/ops adoption pending |

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

3. **Operational Session** SHALL be generalized from table-only DiningSession: keyed by anchor type with type-specific uniqueness. Table occupancy rules (`one open session per table`) are preserved for `anchorType = table`.

4. **Channel** (qr, kiosk, waiter_tablet, …) is provenance / experience only. Channels MUST NOT own Service Mode definitions or invent Fulfilment Anchor types.

5. **Business Identity** remains orthogonal (day/display sequence) and MUST NOT absorb location.

6. Migration SHALL be additive with dual-write of legacy `tableId` / `tableNumber` for table anchors so QR and historical rows remain valid.

Normative detail: `docs/engineering/programs/KIOSK-ORDER-IDENTITY-ARCHITECTURE-1/ARCHITECTURE.md`.  
Runtime foundation: `docs/engineering/programs/ORDER-IDENTITY-RUNTIME-1/ARCHITECTURE.md`.

---

## Consequences

### Positive

- One identity model for all Ordering Channels  
- Removes need for fake tables / `?table=` workarounds  
- Preserves table occupancy where it is operationally real  
- Aligns Kitchen/Expo/Print on fulfilment label  

### Negative / costs

- PlaceOrder, Session, and Read Model implementation programs required  
- Temporary dual fields during migration  
- Ops UI must stop assuming “table” is the only label  

---

## Related Programs

- KIOSK-ORDER-IDENTITY-ARCHITECTURE-1  
- **ORDER-IDENTITY-RUNTIME-1** (runtime foundation — delivered)  
- SELF-ORDERING-KIOSK-PLATFORM-1  
- ORDERING-PLATFORM-ARCHITECTURE-1  
- Suggested follow-ons: PLACE-ORDER-IDENTITY-1 (non-table activation), SESSION-ANCHOR-1, OPS-FULFILMENT-LABEL-1, KIOSK-IDENTITY-ADOPTION-1  

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
| Virtual always-on “counter table” | Historical workaround, not a model |

---

## Acceptance criteria (when Implemented)

- [x] Shared Service Mode + Fulfilment Anchor contracts exist (ORDER-IDENTITY-RUNTIME-1)  
- [x] Runtime projects identity policies; PlaceOrder consumes table identity (ORDER-IDENTITY-RUNTIME-1)  
- [x] Table service path behaviourally compatible with today’s QR  
- [ ] PlaceOrder accepts non-table anchors without channel forks  
- [ ] Ops surfaces render fulfilment label  
- [ ] Kiosk no longer requires `?table=` workaround  
- [x] Architecture guards forbid channel-invented PlaceOrder forks  
