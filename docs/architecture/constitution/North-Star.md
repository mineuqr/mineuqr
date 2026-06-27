# Architecture North Star

> **Authority:** [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md) · Amendment 1
> **Status:** Ratified · Effective 2026-06-27

## Architecture North Star

*Ratification Amendment 1 — inserted per Architecture Authority review.*

The **Architecture North Star** is the permanent evaluation lens for every architectural decision, ADR, program charter, and engineering review in MineuQR 2.0. If a proposal cannot be justified against the North Star, it must not proceed.

### North Star statement

**MineuQR is an Order-centric restaurant operating platform where operational truth lives in one sovereign domain, surrounding capabilities integrate through explicit contracts and domain events, and the platform grows by adding bounded contexts—not by enlarging Order.**

### Evaluation principles

Every architectural decision is judged against the following permanent principles:

| Principle | Meaning |
|---|---|
| **Order remains the operational center** | Guest placement, lifecycle, lines, and totals are owned exclusively by the Order bounded context. Fulfillment, alerts, analytics, and future print/kitchen capabilities orbit Order—they do not co-own it. |
| **Capabilities are added through bounded contexts** | New product surfaces (kitchen display, print connector, session settlement) arrive as integration or supporting contexts with declared ownership—not as router procedures or UI logic. |
| **Every business rule has one owner** | Lifecycle, pricing-at-create, cancellation, visibility, and commercial gating each have exactly one authoritative module (aggregate, policy, specification, or ACL port). Duplication is a constitutional defect. |
| **Every business object has one authority** | `orders` / `order_items` state is mutated only through the Order production path (§13). Read models, notifications, and projections are derived—not co-authoritative. |
| **Integrations use explicit contracts or domain events** | Cross-context effects publish past-tense domain events after commit (ADR-ARCH-004). Direct cross-table writes and inline side effects in command handlers are forbidden (§14, §19). |
| **Evolve by adding domains, not expanding Order indefinitely** | Order absorbs only order lifecycle and invariants (§25). Print jobs, kitchen queues, session settlement, and analytics facts live elsewhere. |
| **Long-term consistency over short-term convenience** | Structural clarity, compliance gates (§28), and fitness functions (§24) take precedence over expedient coupling in routers, UI, or feature flags. |

### How decisions are evaluated

When reviewing any proposal, Architecture Authority asks:

1. Does it respect Order sovereignty (ADR-ARCH-001, ADR-ARCH-007)?
2. Does it preserve a single source of truth (ADR-ARCH-002)?
3. Does it stay within service ownership boundaries (ADR-ARCH-003)?
4. Does it integrate via events or ACL—not inline orchestration (ADR-ARCH-004, §21)?
5. Does it use the single certified production path (ADR-ARCH-005)?
6. Does it keep business logic out of presentation (ADR-ARCH-006)?
7. Does it comply with governance in ADR-ARCH-013?

Affirmative answers on all applicable questions are required for acceptance.

---

---

**Related:** [Quality Attributes](./Quality-Attributes.md) · [ADR Registry](./ADR-Registry.md) · [Order Blueprint](../blueprints/Order-Centric-Architecture.md#1-architecture-vision)