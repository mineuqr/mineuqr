# KIOSK-ORDER-IDENTITY-ARCHITECTURE-1 — Order Identity Architecture
## Binding Architecture Document

**Program:** KIOSK-ORDER-IDENTITY-ARCHITECTURE-1  
**Type:** Architecture Design (no implementation)  
**Status:** CERTIFIED — Architectural Foundation  
**Date:** 2026-07-14  
**Depends on:** ORDER-1 / Order-Centric Architecture, ORDERING-PLATFORM-ARCHITECTURE-1, ADR-ARCH-001/002/007/010, SELF-ORDERING-KIOSK-ARCHITECTURE-1, SELF-ORDERING-KIOSK-PLATFORM-1, ADR-ARCH-018  
**ADR:** ADR-ARCH-019 (Proposed)

---

## 1. Vision

MineuQR must place and fulfil orders for **every Ordering Channel** without pretending every order belongs to a dining table.

This program defines a **platform-wide Order Identity model** so that:

- QR Table Service and Waiter Table Service keep today’s behaviour  
- Kiosk, Counter, Take Away, Food Court, Pickup, Drive-Thru attach without channel-specific PlaceOrder exceptions  
- Kitchen, Expo, Pickup, and Printing consume a stable **fulfilment label**, not a channel inventing meaning  

**Order remains the Core Domain.** Identity answers: *where/how this order is served and grouped operationally* — not *which UI placed it*.

---

## 2. Forensic architecture audit (Phase 1)

### 2.1 Current identity chain (production)

```
Channel (QR table route / Kiosk ?table=)
        │
        ▼
order.create(tableId, tableNumber, …)
        │  authoritative lookup: restaurant_tables by (restaurantId, tableNumber)
        ▼
PlaceOrderCommand { tableId, tableNumber, sessionId? }
        │
        ▼
Order Aggregate (tableId + tableNumber NOT NULL)
        │
        ▼
DiningSession (always table-scoped; one open per tableId)
        │
        ▼
Ops (Kitchen / Expo / Print) ← mostly display tableNumber
```

### 2.2 Evidence summary

| Area | Finding | Classification |
|------|---------|----------------|
| `PlaceOrderCommand` / Order aggregate | `tableId` + `tableNumber` required | Historical assumption (table = identity) |
| `order.create` router | Client `tableId` **ignored**; DB resolve by `tableNumber` | Implementation convenience |
| `dining_sessions` | `tableId` NOT NULL; unique open per `(restaurantId, tableId)` | Operational for table occupancy |
| Business Identity | Day / display sequence only — **no table** | Correctly independent |
| Kitchen / Expo / Print | Consume **`tableNumber` (label)**; Kitchen already maps `tableNumber <= 0` → `"takeaway"` presentation | Ops need label, not FK |
| Read model | Stores both; public DTOs expose `tableNumber` | Convenience + display |
| QR | Route identity = table number | Operational for dine-in |
| Waiter cart contract | `stationId` required; `tableNumber` optional | Forward-looking; blocked by PlaceOrder |
| Kiosk PLATFORM-1 | Cart = device session; PlaceOrder still needs `?table=` | **Convenience workaround** — architectural gap |

### 2.3 Where table is truly required today

| Need | Table required? | Why |
|------|-----------------|-----|
| One open dining visit per physical table | **Yes** | Occupancy / settlement |
| Staff see “Table 7” | **Label required** | Can be fulfilment label, not necessarily FK forever |
| Kitchen ticket routing by station | **No** | Needs fulfilment label / station, not table FK |
| Pricing / notes / BI / tracking token | **No** | Independent |
| Kiosk / counter / pickup order | **No** (forced yes today) | Write-path historical assumption |

### 2.4 Root cause

**Root cause:** The platform collapsed three distinct concepts into `tableId`:

1. **Physical occupancy anchor** (dining table session)  
2. **Fulfilment label** (what staff see / shout)  
3. **PlaceOrder eligibility key** (must resolve a `restaurant_tables` row)

That collapse is correct for QR table service and wrong as a universal law. Kiosk `?table=` is a symptom, not a kiosk defect.

---

## 3. Current identity model (as-is)

| Concept | Current meaning |
|---------|-----------------|
| Canonical PlaceOrder owner | Implicit: **Table** |
| Session | **DiningSession** = table-only |
| Channel | Provenance (qr / kiosk / …) but PlaceOrder contract is table-shaped for all |
| Customer | Optional PII on order |
| Business Identity | Display sequence — orthogonal |
| Fulfilment | Denormalized `tableNumber` treated as fulfilment label |

**Blueprint debt:** `TableReference` VO (`Order-Centric-Architecture.md`) encodes table as the only location VO.

---

## 4. Proposed future identity model (Phase 2)

### 4.1 Decision — canonical concepts

| Concept | Definition | Owns |
|---------|------------|------|
| **Order** | Core Domain aggregate | Lifecycle, lines, money, notes, tracking, BI linkage |
| **Service Mode** | How the guest is being served | Semantic mode (see §5) — stamped on Order at place |
| **Fulfilment Anchor** | Typed operational location/target for fulfilment | Discriminated identity + **display label** for ops |
| **Operational Session** | Optional visit / occupancy / grouping envelope | Open/close rules **per anchor type** |
| **Channel** | Presentation path | Shell / UX only — **never** fulfilment identity |
| **Device / Station** | Channel or ops hardware identity | May *supply* an anchor; does not own Order |
| **Customer Context** | Optional guest PII | Already on Order — unchanged |
| **Business Identity** | Day/display numbering | Unchanged — must not absorb location |

### 4.2 Canonical operational owner

**Question:** What is the canonical operational owner of an Order?

**Answer:**

- The **Order** owns itself (ADR-ARCH-001).  
- For **operational grouping and fulfilment**, the Order **references** a **Fulfilment Anchor** (required) and may reference an **Operational Session** (optional, mode-dependent).  
- **Table is one Fulfilment Anchor type**, not the universal owner.

```
                    Order (Core Domain)
                         │
         ┌───────────────┼──────────────────┐
         ▼               ▼                  ▼
   Service Mode   Fulfilment Anchor   Operational Session?
   (required)     (required)          (optional)
                         │
         ┌───────────────┼────────────────────────┐
         ▼               ▼                        ▼
      table:*        station:*          pickup:* / queue:* / lane:*
```

### 4.3 Fulfilment Anchor (normative)

Discriminated union — **platform-owned**, channel-supplied values:

| `anchorType` | Identity fields | Display label source | Typical modes |
|--------------|-----------------|----------------------|---------------|
| `table` | `tableId`, `tableNumber` | Table number / room label | `table_service` |
| `station` | `stationId` (+ optional restaurant station registry later) | Station display name | `counter`, kiosk counter |
| `pickup_point` | `pickupPointId` | Pickup point name | `pickup`, food court |
| `queue` | `queueId`, `ticketLabel` | Queue ticket | food court / take-away queue |
| `drive_lane` | `laneId` | Lane label | `drive_thru` (future) |
| `none` | — | Synthetic label from service mode + order display # | constrained modes only if ops allow |

**Rules:**

1. Every placed Order SHALL have exactly one Fulfilment Anchor.  
2. Channels SHALL NOT invent anchor types.  
3. Ops surfaces SHALL render `fulfilmentLabel` derived by platform from the anchor (today’s `tableNumber` becomes the table-variant label).  
4. `table` anchor remains the only type that participates in **table occupancy** sessions.

### 4.4 Relationship matrix

| From → To | Relationship |
|-----------|----------------|
| Order → Service Mode | Required, immutable after place |
| Order → Fulfilment Anchor | Required, immutable after place (corrections = ops policy later) |
| Order → Operational Session | Optional FK; required when mode demands occupancy (e.g. table_service) |
| Order → Channel | Provenance metadata only |
| Order → Business Identity | Unchanged allocation path |
| Session → Anchor | Session is keyed by anchor (typed uniqueness) |
| Channel → Mode / Anchor | May *propose* defaults; Platform validates |

---

## 5. Service Mode analysis (Phase 3)

### 5.1 Formal service modes (platform vocabulary)

| Service Mode | Meaning |
|--------------|---------|
| `table_service` | Guest seated / table occupancy |
| `counter` | Order at counter / kiosk; fulfil at counter or pass-through |
| `take_away` | Guest waits / leaves with order; no table occupancy |
| `pickup` | Named pickup point / shelf |
| `delivery` | Future off-premise |
| `drive_thru` | Future lane-based |

### 5.2 Where Service Mode lives

| Option | Verdict |
|--------|---------|
| Channel-owned | **Rejected** — creates channel-specific business meaning |
| Session-only | **Rejected** — orders may exist with ephemeral or no long session |
| Fulfilment Anchor-only | **Insufficient** — same station can serve take-away vs dine-in semantics |
| **Order-stamped Service Mode** | **Accepted** — immutable fulfilment semantic; session may constrain |

**Normative:** Service Mode is a **first-class Order field** (platform enum).  
Operational Session MAY record the mode active for the visit.  
Channel MAY default mode (e.g. kiosk → `counter` or `take_away` per restaurant policy) but MUST NOT redefine enum members.

### 5.3 Mode ↔ Session ↔ Anchor constraints (platform policy)

| Service Mode | Session | Allowed anchors |
|--------------|---------|-----------------|
| `table_service` | **Required** (table occupancy) | `table` only |
| `counter` | Optional short-lived / order-scoped | `station` (preferred), `queue` |
| `take_away` | Optional | `station`, `queue`, `pickup_point` |
| `pickup` | Optional | `pickup_point` |
| `delivery` | Future | future address/zone anchor (out of scope detail) |
| `drive_thru` | Optional | `drive_lane` |

---

## 6. Session model (Phase 4)

### 6.1 Decision

**DiningSession becomes a specialization of Operational Session**, not the universal session law.

```
OperationalSession
  ├── anchorType + anchor identity
  ├── serviceMode
  ├── status (open / settled / …)
  └── uniqueness policy = f(anchorType)
```

| Anchor type | Uniqueness (open sessions) |
|-------------|----------------------------|
| `table` | One open session per `(restaurantId, tableId)` — **preserve today** |
| `station` | Configurable: none \| one open per station \| per device session |
| `pickup_point` / `queue` / `drive_lane` | Typically **order-scoped or none** (no long occupancy) |

### 6.2 Why not “everything is a virtual table”

Rejected: pollutes `restaurant_tables`, breaks occupancy KPIs, forces fake tables for every kiosk, and encodes channel workarounds into master data.

### 6.3 Evidence-backed conclusion

- Table uniqueness is an **operational requirement** for dine-in.  
- Extending that uniqueness to all channels is a **historical assumption**.  
- Generalized Operational Session with **typed anchors** preserves QR/Waiter while unblocking kiosk/counter/pickup.

---

## 7. PlaceOrder & Runtime implications (design only)

### 7.1 Target PlaceOrder command shape (conceptual)

```
PlaceOrderCommand
  restaurantId
  channel
  serviceMode
  fulfilmentAnchor   // discriminated
  operationalSessionId? 
  customer* / notes / items
```

**Compatibility:** For `serviceMode = table_service` + `anchorType = table`, today’s `tableId`/`tableNumber`/`sessionId` mapping remains valid.

### 7.2 Runtime / Client Platform

- Ordering Runtime MAY expose allowed `serviceModes` + anchor policies per restaurant (platform policies — not channel rules).  
- Client Platform checkout submits mode + anchor; channels only supply adapter values (station id, selected table, etc.).  
- Kiosk drops `?table=` **after** implementation programs land — not in this design program.

### 7.3 Operational implications

- Kitchen / Expo / Print: bind to **`fulfilmentLabel`** (+ optional anchor type badge).  
- Occupied-tables KPI: count **table** anchors with open sessions only.  
- Existing `deriveKitchenOrderType(tableNumber)` foreshadows non-table; replace with Service Mode / anchor type formally.

---

## 8. Migration strategy (Phase 5)

**Principle:** Additive, dual-read, QR bit-compatible. No big-bang rewrite.

| Phase | Program (suggested) | Work | Compatibility |
|-------|---------------------|------|---------------|
| **M0** | _(this)_ | Certify model + ADR-ARCH-019 | No code |
| **M1** | ORDER-IDENTITY-CONTRACT-1 | Introduce shared Fulfilment Anchor + Service Mode contracts; map table → anchor in adapters | QR payloads unchanged externally |
| **M2** | PLACE-ORDER-IDENTITY-1 | PlaceOrder accepts anchor+mode; persist dual-write `tableId`/`tableNumber` when table anchor | Existing rows valid |
| **M3** | SESSION-ANCHOR-1 | Generalize session uniqueness by anchor type; table path identical | QR sessions unchanged |
| **M4** | OPS-FULFILMENT-LABEL-1 | Kitchen/Expo/Print/Read Model prefer `fulfilmentLabel` | Labels stable for tables |
| **M5** | KIOSK-IDENTITY-ADOPTION-1 | Kiosk PlaceOrder via `station`/`counter` or `take_away` — remove `?table=` workaround | QR untouched |

### Compatibility guarantees

- Existing QR routes and cart keys unchanged through M3.  
- Historical orders retain `tableId`/`tableNumber`.  
- Business Identity allocation path unchanged.  
- No fake “virtual tables” required for kiosk.  
- Waiter optional table becomes expressible as station + optional table_service upgrade.

---

## 9. Architectural decisions & ADRs (Phase 6)

### 9.1 Required ADR

| ADR | Title | Status |
|-----|-------|--------|
| **ADR-ARCH-019** | Order Identity via Service Mode + Fulfilment Anchor | **Proposed** (this program) |

Optional follow-ons (implementation programs): session uniqueness policy ADR; restaurant station registry ADR.

### 9.2 Boundary / ownership changes

| Concern | Before | After |
|---------|--------|-------|
| PlaceOrder location key | Always table | Fulfilment Anchor (table is one type) |
| Session | Dining/table only | Operational Session keyed by anchor type |
| Ops label | `tableNumber` | `fulfilmentLabel` (table number when table) |
| Channel | Forced table shape | Supplies mode defaults + anchor facts |
| Business Identity | — | Unchanged |

### 9.3 Forbidden

- Channel-specific PlaceOrder forks (`KioskPlaceOrder`, etc.)  
- Encoding kiosk/counter as fake `restaurant_tables` rows  
- Putting Service Mode ownership in channel UI  
- Moving BI or pricing into identity  

---

## 10. Risks

| Risk | Mitigation |
|------|------------|
| Over-generalization delays QR | Table path remains first-class; migration dual-writes |
| Ops UI assumes table forever | M4 fulfilment label; keep tableNumber alias |
| Session uniqueness wrong for stations | Policy table per anchor type; default conservative |
| Scope creep into schema now | This program is design-only; M1+ implement |
| Channel invents modes | Closed platform enum + architecture guards |

---

## 11. Out of scope (this program)

Schema · migrations · PlaceOrder code · Session code · BI changes · Kiosk/Waiter/Ops UI · Kitchen/Print code · any production implementation.

---

## 12. Certification

**KIOSK-ORDER-IDENTITY-ARCHITECTURE-1 is CERTIFIED as the official architectural foundation for non-table and multi-mode Order Identity in MineuQR.**

Implementation MUST NOT begin until ADR-ARCH-019 is accepted and a follow-on implementation program is approved.
