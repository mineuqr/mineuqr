# Architecture Glossary

Official terms for MineuQR 2.0 architecture documentation.

| Term | Definition |
|---|---|
| **Aggregate** | Cluster of domain objects (root + entities) treated as a single consistency boundary for mutations. Order is the sole core aggregate in ORDER-1 scope. |
| **ACL (Anti-Corruption Layer)** | Translation layer isolating the Order domain from external context models (Commercial, Restaurant, Identity, future Kitchen/Printing). |
| **Application Service** | Orchestrates commands/queries: loads aggregate, invokes domain behavior, persists, publishes events. Contains no business rules. |
| **Architecture Authority** | Governing body that ratifies the Constitution, accepts ADRs, approves programs, and certifies compliance. |
| **Architecture Constitution** | Supreme architectural document (v1.0.0) comprising Part I Blueprint, Part II Governance, North Star, Quality Attributes, and ADR Registry. |
| **Architecture Traceability Matrix (ATM)** | Per-program table mapping requirements to Blueprint §, ADRs, code artifacts, and fitness functions. |
| **Blueprint** | Order-Centric Architecture specification (Constitution Part I, §1–17). Operationalizes ADRs into aggregate design. |
| **Bounded Context** | Autonomous domain area with explicit ownership (Order, Commercial, Restaurant, etc.). |
| **Domain Event** | Past-tense, immutable fact emitted after aggregate commit (e.g. OrderCreated). Integration mechanism per ADR-ARCH-004. |
| **Fitness Function** | Automated or review-based rule (FF-01–FF-18) verifying architectural compliance. |
| **Implementation Program** | Time-bounded execution vehicle (ORDER-1, ORDER-EVENTS-1) chartered against Constitution and ADRs. |
| **Invariant** | Business rule that must always hold (INV-01–INV-15). Enforced by aggregate and policies. |
| **Policy** | Pure domain rule object (e.g. OrderLifecyclePolicy) with no I/O. |
| **Production Path** | Single certified flow: Command → Application → Aggregate → Repository → Commit → Events → Subscribers → Read Models → UI (§13). |
| **Program Certification** | Formal compliance sign-off (Certified / Conditionally Certified / Not Certified) per §28. |
| **Projection** | Process that updates a read model from domain events. |
| **Read Model** | Denormalized query-optimized view (OwnerOrderList, PublicOrderStatus). Never authoritative for writes. |
| **Repository** | Persistence port that loads/saves aggregates atomically. |
| **Specification** | Composable domain predicate (e.g. GuestOrderingAllowedSpec) used before command execution. |
| **Single Source of Truth (SSOT)** | Persisted server state and server read models are authoritative; client cannot own business metrics (ADR-ARCH-002). |

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md)
