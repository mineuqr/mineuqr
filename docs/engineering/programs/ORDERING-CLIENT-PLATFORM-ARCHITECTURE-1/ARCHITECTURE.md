# ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1 — Architecture
## Binding Architecture Document

**Program:** ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1  
**Type:** Architecture Design (no implementation in this program)  
**Status:** CERTIFIED — Architectural Foundation  
**Date:** 2026-07-14  
**Depends on:** ORDERING-PLATFORM-ARCHITECTURE-1, ORDERING-RUNTIME-CONTEXT-1, ORDERING-RUNTIME-MATERIALIZATION-1, QR-ORDERING-RUNTIME-MIGRATION-1, SELF-ORDERING-KIOSK-ARCHITECTURE-1, ORDERING-NOTES-ARCHITECTURE-1  
**ADR:** ADR-ARCH-018 (Proposed)

---

## 1. Vision

MineuQR Ordering Platform owns business rules. Operational Platform owns execution.  
This program defines the missing **Ordering Client Platform**: the single shared presentation/runtime consumption layer for every ordering channel.

```
                 Ordering Platform
                         │
                         ▼
              OrderingRuntimeContext
                         │
                         ▼
             Ordering Client Platform
                         │
      ┌──────────┬────────────┬────────────┐
      ▼          ▼            ▼            ▼
     QR       Kiosk      Waiter Device   (future)
```

Channels supply **shell and channel UX only**. The complete shared ordering experience lives in the Ordering Client Platform.

---

## 2. Architecture audit (Phase 1)

### 2.1 Current state (factual)

| Area | Reality |
|------|---------|
| Live ordering UX | **QR table channel only** |
| Runtime | QR correctly consumes `ordering.getRuntimeBySlug` → `OrderingRuntimeContext` |
| Cart | `CartContext` + `cartStorage` scoped to `{slug, tableNumber}` — QR-shaped |
| Browse | `MenuView` owns category/search/tabs + templates |
| Checkout | `CheckoutPage` owns review, customer fields, order notes, place order |
| Item notes UI | DTO/context support exists; **no editor UI** |
| Kiosk | Contracts only (`kiosk*.ts`); **no UI** |
| Waiter tablet | Channel id only; **no client surface** |

### 2.2 Current ownership map

| Symbol | Owns today | Coupling |
|--------|------------|----------|
| `useQrOrderingRuntime` | Fetch + flatten + gates | QR-named |
| `deriveQrOrderingRuntimeGates` / `deriveKioskOrderingRuntimeGates` | Read-only gate maps | Logic duplicated |
| `MenuView` | Browse UX + eligibility composition | QR routes/session |
| `TableOrderingShell` | Cart scope + menu↔checkout | QR table |
| `CheckoutPage` | Checkout + notes + `order.create` | QR table |
| `CartProvider` / `cartStorage` | Cart state | QR table identity |
| `CartDrawer` / `AddToCartButton` | Cart UX | QR paths / cart context |
| `MenuTemplates` / `components/menu/*` | Visual templates | Soft-coupled via `tableNumber` + cart |
| Dining session / post-submission / tracking | Guest lifecycle | **QR-only** |
| `shared/ordering-platform/*` | Contracts, notes validators, offer IDs | Platform |
| Kiosk contracts | Experience/session vocabulary | Channel (unused by UI) |

### 2.3 Primary architectural gap

There is **no shared Ordering Client Platform module**. QR embeds the entire ordering experience. Shipping Kiosk or Waiter by copying QR would recreate cart, browse, checkout, notes, and gate derivation — violating Platform Before Channels and Composition over Duplication.

---

## 3. Proposed ownership map (Phase 2–3)

### 3.1 Layer stack (normative)

| Layer | Owns | Does not own |
|-------|------|--------------|
| **Ordering Platform** | Catalog rules, pricing, validation, notes contracts, place order, runtime materialization | UI, channel shells |
| **Ordering Client Platform** | Shared browse/cart/checkout presentation, cart orchestration, runtime consumption hooks, notes entry UX, loading/error presentation, in-experience navigation state | Channel bootstrap, authentication, idle/language, session resolution, kitchen/print |
| **Channel (QR / Kiosk / Waiter)** | Shell, entry, form-factor UX, channel navigation into platform, channel lifecycle | Pricing, validation, reconstructed notes, duplicate cart engines |
| **Operational Platform** | Kitchen, Expo, Pickup, printing, status execution | Guest ordering UX |

### 3.2 Ordering Client Platform owns

- Catalog browsing presentation (categories, items, offers tabs as shared stages)
- Category navigation state (shared controller)
- Item browsing / add-to-cart controls
- Item customization entry surface (**when** platform projects modifiers — presentation only)
- Cart state orchestration (abstract scope; not table-hardcoded)
- Cart presentation (summary/list/qty — not channel route strings)
- Checkout presentation (summary, readiness from gates)
- Order summary
- Order notes entry (capability-aware)
- Item notes entry (capability-aware)
- Loading / error presentation for ordering stages
- Runtime integration (`useOrderingRuntime` pattern; channel supplies delivery options)
- Client navigation state **within** the ordering experience (browse ↔ cart ↔ checkout)
- Shared ordering components under `components/ordering/`

### 3.3 Ordering Client Platform does **not** own

| Concern | Owner |
|---------|-------|
| QR bootstrap / deep links / table URL model | QR |
| Kiosk idle / language / auto-reset / kiosk shell | Kiosk |
| Waiter login / table workspace / session resolution / waiter shell | Waiter |
| Dining session recovery / post-submission guest tracking | QR |
| Order execution / Kitchen / Expo / Printing | Operational Platform |
| Business rules / PlaceOrder / validators | Ordering Platform (+ `@shared` contracts) |
| Runtime construction/materialization | Server Ordering Platform |

### 3.4 Channel boundaries (Phase 3)

#### QR owns
- QR entry & deep links  
- Mobile-specific UX / responsive chrome  
- Table context presentation  
- Dining session + post-submission + tracking pages  
- Thin wrappers that inject QR navigator + cart scope into the platform  

#### Kiosk owns
- Idle / welcome screens  
- Touch-first shell & language selection  
- Auto reset & session isolation (per `kioskSessionLifecycle`)  
- Form-factor layout chrome  
- Injects kiosk navigator + device/session cart scope into the platform  

#### Waiter owns
- Authentication  
- Table workspace & session resolution  
- Waiter shell  
- Injects staff identity + selected table/session cart scope into the platform  

**Everything else in the ordering experience** belongs to Ordering Client Platform.

### 3.5 Refinement of SELF-ORDERING-KIOSK-ARCHITECTURE-1

Kiosk program previously listed “browse / cart / checkout UX” as kiosk-owned.  
**Refined:** Kiosk owns **presentation chrome and lifecycle stages**; shared browse/cart/checkout **experience composition** is Ordering Client Platform. Kiosk may still style/stage-gate those surfaces, but must not reimplement them.

---

## 4. Composition architecture (Phase 4)

### 4.1 Composition model

```
Channel Shell
  · resolves channel identity (qr | kiosk | waiter_tablet)
  · resolves runtime delivery (same entry: ordering.getRuntimeBySlug)
  · provides CartScopeAdapter + OrderingNavigator
  · provides channel chrome (idle/login/table/deep-link)
        │
        ▼
Ordering Client Platform
  · useOrderingRuntime(channel) → gates + catalogs
  · CartOrchestrator(scopeAdapter)
  · BrowseExperience | CartExperience | CheckoutExperience
  · Notes fields (capability-gated)
  · PlaceOrder command assembly → platform mutation only
        │
        ▼
OrderingRuntimeContext (immutable)
        │
        ▼
Ordering Platform (PlaceOrderService, validators, pricing)
```

### 4.2 Required abstractions (design contracts — implement in follow-on programs)

| Abstraction | Responsibility |
|-------------|----------------|
| `CartScopeAdapter` | Persistence key + isolation (table vs device session vs waiter station) |
| `OrderingNavigator` | Channel routes for browse/cart/checkout/confirmation without hardcoding `/menu/...` |
| `OrderingRuntimeConsumer` | Shared gate derivation from `OrderingRuntimeContext` |
| `OrderingExperienceHost` | Composes browse → cart → checkout stages |

### 4.3 Forbidden

- Channel bypassing Client Platform to invent parallel cart/pricing/validation  
- Client Platform constructing or mutating `OrderingRuntimeContext`  
- Client Platform calling repositories or domain services directly  
- Duplicating note validators outside `@shared/ordering-platform/orderingNotesContract`  

### 4.4 Proposed module placement (repo conventions)

```
client/src/lib/ordering-platform/     # KEEP — channel contracts + gate pure fns
client/src/lib/ordering-client/       # NEW — shared client platform
  runtime/                            # useOrderingRuntime, shared gates
  cart/                               # types, orchestrator, scope adapters interface
  navigation/                         # OrderingNavigator types
  notes/                              # capability-aware presentation helpers
client/src/components/ordering/       # NEW — shared UI primitives
client/src/pages/                     # Channel pages remain (QR today; kiosk/waiter later)
```

Mirrors `lib/operational-screen` + `components/operational-screen`.

---

## 5. Migration strategy (Phase 5)

**Principle:** Extract behind adapters; keep QR behavior bit-identical until cutover. No big-bang rewrite. No parallel permanent implementations.

| Phase | Program (suggested) | Work | Risk control |
|-------|---------------------|------|--------------|
| **M0** | _(this)_ | Certify architecture + ADR | No code |
| **M1** | ORDERING-CLIENT-RUNTIME-1 | Shared gate derivation + `useOrderingRuntime`; QR becomes thin wrapper | QR continues calling same API |
| **M2** | ORDERING-CLIENT-CART-1 | Abstract `CartScopeAdapter`; migrate storage behind adapter; QR table adapter default | sessionStorage semantics unchanged for QR |
| **M3** | ORDERING-CLIENT-BROWSE-1 | Extract browse controller + shared add-to-cart controls from `MenuView` | Templates keep skins; behavioral parity tests |
| **M4** | ORDERING-CLIENT-CHECKOUT-1 | Shared checkout + notes fields; capability gating | Existing QR customer/session wiring stays in shell |
| **M5** | QR-ORDERING-CLIENT-ADOPTION-1 | QR shell only; experience hosted by platform | Feature flags / golden path E2E |
| **M6+** | Kiosk / Waiter UI programs | Channel shells compose platform | After M1–M5 certified |

### Compatibility rules

- Existing QR routes remain stable (`/menu/:slug/table/:n`, checkout, tracking).  
- No user-visible regression on place order, cart persistence, dining session.  
- Temporary wrappers allowed; **final** architecture must not leave QR-only duplicates of platform concerns.  
- Public browse-only `/menu/:slug` may continue without CartProvider.

---

## 6. Validation (Phase 6)

| Criterion | Result |
|-----------|--------|
| Ownership boundaries defined | **Pass** — §3 |
| Component responsibilities | **Pass** — §3.2–3.4, §4 |
| Runtime integration | **Pass** — channels consume runtime only via Client Platform consumer |
| State ownership | **Pass** — cart orchestration platform; scope adapters channel-supplied |
| Navigation ownership | **Pass** — in-experience nav platform; entry/shell nav channel |
| Scalability | **Pass** — waiter/mobile attach as shells |
| Backward compatibility | **Pass** — phased migration without QR rewrite |
| Scope creep avoided | **Pass** — no Kiosk/Waiter/QR redesign implementation in this program |

---

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Over-extraction breaks QR templates | Extract controllers/controls first; keep `MenuTemplates` as channel skin consumers |
| Cart scope abstraction wrong for kiosk reset | Design against `kioskSessionLifecycle` isolation rules in M2 ADR appendix |
| Parallel QR + platform carts during migration | Single CartProvider implementation; adapters only — no second store |
| Notes capabilities unused → channel divergence | M4 mandates capability gating from runtime gates |
| Kiosk ownership doc drift | §3.5 refinement; ADR-ARCH-018 |
| Premature Waiter/Kiosk UI | Explicitly out of scope until M5 |

---

## 8. ADRs required

| ADR | Title | Status |
|-----|-------|--------|
| **ADR-ARCH-018** | Ordering Client Platform as Shared Channel Experience Layer | **Proposed** (this program) |

Optional follow-ons (deferred to implementation programs):

- Cart scope adapter ADR (if M2 surfaces non-obvious persistence rules)  
- Ordering navigator ADR (if multi-channel routing needs constitutional force)

---

## 9. Out of scope (this program)

No implementation of: Kiosk UI, Waiter UI, QR redesign, Operational Platform, Ordering Domain, Runtime, Business Identity, Database, Read Model, Printing, Kitchen, Expo.

---

## 10. Certification

**ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1 is CERTIFIED as the official architectural foundation for present and future Ordering Channels.**

Implementation must not begin until ADR-ARCH-018 is accepted by Architecture Authority and a follow-on implementation program is approved.
