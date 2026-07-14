# ADR-ARCH-018: Ordering Client Platform as Shared Channel Experience Layer

> [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Owner** | Architecture Authority |
| **Program** | ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1 |
| **Date** | 2026-07-14 |
| **Supersedes** | — |
| **Refines** | ORDERING-PLATFORM-ARCHITECTURE-1 channel experience split; SELF-ORDERING-KIOSK-ARCHITECTURE-1 browse/cart/checkout ownership |
| **Implementation status** | Partial — ORDERING-CLIENT-RUNTIME-1 delivered runtime foundation; cart/browse/checkout extraction pending |

---

## Context

ORDERING-PLATFORM-ARCHITECTURE-1 established that channels must not own business logic and must consume Ordering Runtime. QR Ordering is the only live client; cart, browse, checkout, and notes presentation are embedded in QR pages and QR-scoped cart storage.

SELF-ORDERING-KIOSK-ARCHITECTURE-1 and Waiter Tablet channel IDs imply additional clients. Without a shared **client experience layer**, each channel would reimplement:

- Runtime gate derivation  
- Cart orchestration  
- Catalog browse controllers  
- Checkout presentation  
- Notes entry UX  

That would violate Single Source of Truth, Platform Before Channels, and Composition over Duplication at the **client** tier (even while server Ordering Platform remains correct).

ADR-ARCH-006 (UI as Presentation Only) forbids UI-owned business rules but does not define a shared ordering experience platform between Runtime and channel shells.

---

## Decision

Introduce a constitutional client layer: **Ordering Client Platform**.

```
Ordering Platform → OrderingRuntimeContext → Ordering Client Platform → Channel Shells
```

1. **Ordering Client Platform** SHALL own the shared ordering experience composition: browse, cart orchestration, checkout presentation, notes entry UX, in-experience navigation state, loading/error presentation for ordering stages, and runtime consumption hooks.

2. **Channels** (QR, Kiosk, Waiter Tablet, future) SHALL own shells and channel-specific UX only: entry, deep links, idle/language, authentication, table/session resolution, tracking/post-submission (QR), and form-factor chrome.

3. Channels SHALL compose the Ordering Client Platform via explicit adapters (`CartScopeAdapter`, `OrderingNavigator`) and SHALL NOT bypass it with parallel cart engines, validators, or pricing.

4. Ordering Client Platform SHALL NOT construct or mutate `OrderingRuntimeContext`, SHALL NOT own Domain/PlaceOrder business rules, and SHALL NOT own Operational Platform concerns.

5. Migration SHALL be phased with QR behavioral compatibility; Kiosk/Waiter UI programs SHALL not start until shared platform extraction programs are certified.

Normative detail: `docs/engineering/programs/ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1/ARCHITECTURE.md`.

---

## Consequences

### Positive

- One ordering experience for all channels  
- Clear separation from Operational Platform and Ordering Domain  
- Enforced reuse of notes capabilities and runtime gates  
- Scalable attachment of Waiter / Mobile / future channels  

### Negative / costs

- Requires phased extraction from QR before Kiosk UI  
- Temporary wrappers during migration  
- Kiosk architecture ownership phrasing for browse/cart/checkout must be read as **refined** by this ADR  

---

## Related Blueprint Sections

Ordering Platform multi-channel vision; Presentation vs Domain boundaries (Constitution / ADR-ARCH-006).

---

## Related Programs

- ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1  
- ORDERING-PLATFORM-ARCHITECTURE-1  
- QR-ORDERING-RUNTIME-MIGRATION-1  
- SELF-ORDERING-KIOSK-ARCHITECTURE-1  
- ORDERING-NOTES-ARCHITECTURE-1  
- Follow-ons: ORDERING-CLIENT-RUNTIME-1, ORDERING-CLIENT-CART-1, ORDERING-CLIENT-BROWSE-1, ORDERING-CLIENT-CHECKOUT-1  

---

## Related ADRs

| ADR | Relationship |
|-----|----------------|
| ADR-ARCH-002 | SSOT — client experience must not fork business meaning |
| ADR-ARCH-006 | UI presentation only — Client Platform remains presentation/orchestration, not Domain |
| ADR-ARCH-003 | Service ownership — complements client-layer ownership |

---

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Keep QR as de-facto template; copy for Kiosk/Waiter | Guarantees duplication and drift |
| Put all experience in `shared/ordering-platform` | Wrong tier — shared package is contracts; experience is client UI/state |
| Channel owns full experience; only server platform shared | Fails Platform Before Channels at UI layer |
| Big-bang rewrite of MenuView/Checkout | Violates Minimal Safe Change and QR compatibility |

---

## Acceptance criteria (when Implemented)

- [ ] Shared `ordering-client` module exists and owns cart orchestration + runtime consumer  
- [ ] QR is a thin shell composing the platform  
- [ ] No second cart/validation implementation in channel code  
- [ ] Architecture guards enforce Client Platform boundaries  
