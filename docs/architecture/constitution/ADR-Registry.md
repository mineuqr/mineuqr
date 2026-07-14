# Architecture Decision Registry

> **Authority:** [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md) · Amendment 3
> **Status:** Ratified constitutional index

# Architecture Decision Registry

*Ratification Amendment 3 — authoritative constitutional index.*

| ADR | Title | Status | Owner | Program | Supersedes | Affected Blueprint § | Implementation Status | Notes |
|---|---|---|---|---|---|---|---|---|
| ADR-ARCH-001 | Order as the Core Domain | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §1, §2, §3, §9, §25 | Not implemented | Baseline code non-compliant (router-centric) |
| ADR-ARCH-002 | Single Source of Truth | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §6, §10, §11, §13 | Partial | Server pricing authoritative; client KPIs violate until ORDER-1 |
| ADR-ARCH-003 | Service Ownership Boundaries | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §2, §6, §12, §21 | Partial | Inline notification/session coupling violates |
| ADR-ARCH-004 | Event-Driven Domain Integration | **Accepted — Ratified** | Architecture Authority | ORDER-1, ORDER-EVENTS-1 | — | §8, §12, §13, §15 | Not implemented | Sync side effects in current router |
| ADR-ARCH-005 | Production Path Authority | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §13, §14 | Partial | `TABLE_SESSION_DUAL_WRITE` divergent path |
| ADR-ARCH-006 | UI as Presentation Only | **Accepted — Ratified** | Architecture Authority | ORDER-1, ORDERS-WORKSPACE-1 | — | §11, §14 | Not implemented | Dashboard computes statistics client-side |
| ADR-ARCH-007 | Order Aggregate Authority | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §3–§7, §10 | Not implemented | No aggregate module; db direct mutation |
| ADR-ARCH-008 | Order Outbox and Event Relay | **Accepted — Ratified** | Architecture Authority | ORDER-EVENTS-1 | — | §8, §10, §15 | Not implemented | Proposed in ARCH-1; ratified with Constitution |
| ADR-ARCH-009 | Order Read Models Own Dashboard Analytics | **Accepted — Ratified** | Architecture Authority | ORDER-1, ORDERS-WORKSPACE-1 | — | §11, §14 | Not implemented | Replaces client `buildOrderStatistics` |
| ADR-ARCH-010 | Session Integration via Order Events Only | **Accepted — Ratified** | Architecture Authority | ORDER-1, ORDER-EVENTS-1 | — | §8, §12, §15 | Not implemented | Retire inline session aggregate writes |
| ADR-ARCH-011 | Optimistic Concurrency on Order Root | **Accepted — Ratified** | Architecture Authority | ORDER-1 | — | §10, §23 | Not implemented | Prevent lost updates on status |
| ADR-ARCH-012 | Printing and Kitchen as Event Consumers | **Accepted — Ratified** | Architecture Authority | KITCHEN-DISPLAY-1, PRINTING-1 | — | §2, §12, §15 | N/A (future) | RESET-1 retired print; re-entry via events only |
| ADR-ARCH-013 | **Architecture Constitution & Governance** | **Accepted — Ratified** | Architecture Authority | Constitution v1.0 | — | §18–29, entire Constitution | **Implemented (governance)** | This document; engineering compliance pending ORDER-1 |
| ADR-ARCH-014 | Event Delivery Guarantees | **Accepted — Ratified** | Architecture Authority | ORDER-EVENTS-1B | — | §8, §12, §15, §22 | **Implemented** | Consumer idempotency + registration policy |
| ADR-ARCH-016 | Distributed Printing Topology | **Accepted** (v1.2) | Architecture Authority | PRINT-ARCHITECTURE-2, PRINT-GATEWAY-1, PRINT-CONNECTOR-NETWORK-1, PRINT-CONNECTOR-LOCAL-1, PRINT-CONNECTOR-WINDOWS-1 | v1.1 | Printing Platform §Deployment | **Partial** | Gateway, Session, RLC, Windows RLC complete; production validation pending |
| ADR-ARCH-017 | Printer Catalog Ownership and Lifecycle | **Accepted** (v1.1) | Architecture Authority | PRINT-CONNECTOR-ONBOARDING-1A | PRINT-PRINTER-CATALOG-1 | Printing Platform §Catalog | **Implemented** | Extends ADR-ARCH-016; retires `print_connector_selections` as SSOT; mandates pure catalog reads |
| ADR-ARCH-018 | Ordering Client Platform as Shared Channel Experience Layer | **Accepted** | Architecture Authority | ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1 | ORDERING-CLIENT-GOVERNANCE-1 | Ordering multi-channel client tier | Implemented + governed | Inserts Client Platform between Runtime and channel shells; refines Kiosk browse/cart/checkout ownership |
| ADR-ARCH-019 | Order Identity via Service Mode and Fulfilment Anchor | **Accepted** | Architecture Authority | KIOSK-ORDER-IDENTITY-ARCHITECTURE-1 | ORDER-IDENTITY-RUNTIME-1 … KIOSK-IDENTITY-ADOPTION-1, OPERATIONAL-FULFILMENT-PROJECTION-1 | Order identity / PlaceOrder / Session / Read | Partial (fulfilment projected) | Read Model + ops DTOs project fulfilment; UI label preference pending |

**Registry maintenance:** Principal Engineer updates Implementation Status at program exit certification. Status changes require Architecture Authority approval per §26.

---

## Individual ADR documents

| ADR | Document |
|---|---|
| ADR-ARCH-001 | [ADR-ARCH-001.md](../adrs/ADR-ARCH-001.md) |
| ADR-ARCH-002 | [ADR-ARCH-002.md](../adrs/ADR-ARCH-002.md) |
| ADR-ARCH-003 | [ADR-ARCH-003.md](../adrs/ADR-ARCH-003.md) |
| ADR-ARCH-004 | [ADR-ARCH-004.md](../adrs/ADR-ARCH-004.md) |
| ADR-ARCH-005 | [ADR-ARCH-005.md](../adrs/ADR-ARCH-005.md) |
| ADR-ARCH-006 | [ADR-ARCH-006.md](../adrs/ADR-ARCH-006.md) |
| ADR-ARCH-007 | [ADR-ARCH-007.md](../adrs/ADR-ARCH-007.md) |
| ADR-ARCH-008 | [ADR-ARCH-008.md](../adrs/ADR-ARCH-008.md) |
| ADR-ARCH-009 | [ADR-ARCH-009.md](../adrs/ADR-ARCH-009.md) |
| ADR-ARCH-010 | [ADR-ARCH-010.md](../adrs/ADR-ARCH-010.md) |
| ADR-ARCH-011 | [ADR-ARCH-011.md](../adrs/ADR-ARCH-011.md) |
| ADR-ARCH-012 | [ADR-ARCH-012.md](../adrs/ADR-ARCH-012.md) |
| ADR-ARCH-013 | [ADR-ARCH-013.md](../adrs/ADR-ARCH-013.md) |
| ADR-ARCH-014 | [ADR-ARCH-014.md](../adrs/ADR-ARCH-014.md) |
| ADR-ARCH-016 | [ADR-ARCH-016.md](../adrs/ADR-ARCH-016.md) |
| ADR-ARCH-017 | [ADR-ARCH-017-printer-catalog-ownership-and-lifecycle.md](../adrs/ADR-ARCH-017-printer-catalog-ownership-and-lifecycle.md) |
| ADR-ARCH-018 | [ADR-ARCH-018-ordering-client-platform.md](../adrs/ADR-ARCH-018-ordering-client-platform.md) |
| ADR-ARCH-019 | [ADR-ARCH-019-order-identity-fulfilment-anchor.md](../adrs/ADR-ARCH-019-order-identity-fulfilment-anchor.md) |

**Related:** [Blueprint](../blueprints/Order-Centric-Architecture.md) · [ADR Lifecycle](../governance/ADR-Lifecycle.md)