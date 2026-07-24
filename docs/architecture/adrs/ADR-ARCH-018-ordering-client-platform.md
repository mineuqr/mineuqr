# ADR-ARCH-018: Ordering Client Platform as Shared Channel Experience Layer

> [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1 |
| **Date** | 2026-07-14 |
| **Supersedes** | — |
| **Refines** | ORDERING-PLATFORM-ARCHITECTURE-1 channel experience split; SELF-ORDERING-KIOSK-ARCHITECTURE-1 browse/cart/checkout ownership |
| **Implementation status** | Implemented — RUNTIME-1 + CART-1 + BROWSE-1 + CHECKOUT-1 + GOVERNANCE-1 · Runtime Identity Invariant (SELF-ORDERING-RUNTIME-IDENTITY-FIX-1) |

---

## Context

ORDERING-PLATFORM-ARCHITECTURE-1 established that channels must not own business logic and must consume Ordering Runtime. QR Ordering is the only live client; without a shared **client experience layer**, each channel would reimplement cart, browse, checkout, notes presentation, and gate derivation.

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

5. Migration SHALL be phased with QR behavioral compatibility; Kiosk/Waiter UI programs SHALL not start until shared platform extraction **and governance** programs are certified.

6. **Ordering Runtime Identity Invariant (constitutional) — [OI-RT-01](../constitution/Ordering-Invariants.md#oi-rt-01--runtime-identity-continuity).** Within a single customer ordering journey, channel Runtime Identity (including Kiosk `deviceSessionId` and any CartScope identity segment derived from it) **MUST remain immutable** across Browse → Cart → Checkout → Payment → Confirmation. A new Runtime Identity may be created **only** when the customer explicitly starts a new order, the journey is intentionally reset, or idle-timeout policy ends the session. Navigation, provider remounts, and route transitions MUST NOT mint a new journey identity. Normative channel detail: SELF-ORDERING-KIOSK-ARCHITECTURE-1 §6; implementation: SELF-ORDERING-RUNTIME-IDENTITY-FIX-1.

### Governance rules (ORDERING-CLIENT-GOVERNANCE-1)

Normative detail: `docs/engineering/programs/ORDERING-CLIENT-GOVERNANCE-1/ARCHITECTURE.md`.

| Rule | Requirement |
|------|-------------|
| Execution path | Channel → Client Platform → Runtime → Ordering Platform only |
| Runtime query | Sole `getRuntimeBySlug` consumer is `useOrderingRuntime` |
| Cart / browse / checkout | Client Platform providers only |
| Adapters | Every channel supplies `CartScopeAdapter` + `OrderingNavigator` |
| CartScope extension | QR table; Kiosk `deviceSessionId`; Waiter `stationId` (+ optional table/session) |
| **Runtime Identity** | **[OI-RT-01](../constitution/Ordering-Invariants.md#oi-rt-01--runtime-identity-continuity)** — Immutable for one customer journey; survive Browse→Cart→Checkout→Payment→Confirmation; rotate only on new order / intentional reset / idle timeout |
| Navigator stages | `goToBrowse`, `goToCart`, `goToCheckout`, `goToConfirmation`, `goToTracking` |
| Dependencies | Channel pages MUST NOT import `@shared/ordering-platform` business modules or call runtime delivery directly |
| Guards | Permanent architecture tests under `ordering-client/__tests__/*governance*` |

---

## Consequences

### Positive

- One ordering experience for all channels  
- Clear separation from Operational Platform and Ordering Domain  
- Enforced reuse of notes capabilities and runtime gates  
- Scalable attachment of Waiter / Mobile / future channels  
- Permanent guards block regression before Kiosk/Waiter UI  

### Negative / costs

- Adapter factories required per channel  
- Kiosk architecture ownership phrasing for browse/cart/checkout must be read as **refined** by this ADR  

---

## Related Blueprint Sections

Ordering Platform multi-channel vision; Presentation vs Domain boundaries (Constitution / ADR-ARCH-006).

---

## Related Programs

- ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1  
- ORDERING-CLIENT-RUNTIME-1  
- ORDERING-CLIENT-CART-1  
- ORDERING-CLIENT-BROWSE-1  
- ORDERING-CLIENT-CHECKOUT-1  
- ORDERING-CLIENT-GOVERNANCE-1  
- ORDERING-PLATFORM-ARCHITECTURE-1  
- QR-ORDERING-RUNTIME-MIGRATION-1  
- SELF-ORDERING-KIOSK-ARCHITECTURE-1  
- SELF-ORDERING-RUNTIME-IDENTITY-FIX-1  
- SELF-ORDERING-CART-RUNTIME-FORENSICS-1  
- ORDERING-NOTES-ARCHITECTURE-1  

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

## Acceptance criteria

- [x] Shared `ordering-client` module exists and owns cart orchestration + runtime consumer  
- [x] Shared browse orchestration owned by Client Platform (ORDERING-CLIENT-BROWSE-1)  
- [x] Shared checkout orchestration owned by Client Platform (ORDERING-CLIENT-CHECKOUT-1)  
- [x] QR is a thin shell composing the platform (browse + cart + checkout)  
- [x] No second cart/validation implementation in channel code  
- [x] Architecture guards enforce Client Platform boundaries (ORDERING-CLIENT-GOVERNANCE-1)  
- [x] CartScopeAdapter + OrderingNavigator hardened for QR / Kiosk / Waiter  
- [x] Ordering Runtime Identity Invariant: journey `deviceSessionId` / CartScope identity survives Browse→Cart→Checkout without remount drift (SELF-ORDERING-RUNTIME-IDENTITY-FIX-1)  
