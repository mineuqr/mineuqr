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
| ADR-ARCH-018 | Ordering Client Platform as Shared Channel Experience Layer | **Accepted** | Architecture Authority | ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1 | ORDERING-CLIENT-GOVERNANCE-1 · SELF-ORDERING-RUNTIME-IDENTITY-FIX-1 | Ordering multi-channel client tier | Implemented + governed · Runtime Identity Invariant | Inserts Client Platform between Runtime and channel shells; refines Kiosk browse/cart/checkout ownership; journey identity immutable across Browse→Confirmation |
| ADR-ARCH-019 | Order Identity via Service Mode and Fulfilment Anchor | **Accepted** | Architecture Authority | KIOSK-ORDER-IDENTITY-ARCHITECTURE-1 | ORDER-IDENTITY-RUNTIME-1 … OPERATIONAL-FULFILMENT-PRESENTATION-1 | Order identity / PlaceOrder / Session / Read / Ops UI | Implemented (presentation adopted) | Ops UIs consume projected fulfilmentLabel; tableNumber heuristics removed |
| ADR-ARCH-020 | Financial Settlement Platform Architecture | **Accepted** | Architecture Authority | SALES-SETTLEMENT-PLATFORM-ARCHITECTURE-1 · CHECK-GENERALIZATION-ARCHITECTURE-1 | — | Check / Session / Reporting financial SSOT | **Not implemented** | Generalizes Check; membership + optional Session; forbids second monetary aggregate / ERP |
| ADR-ARCH-021 | Event Idempotency Governance | **Accepted** | Architecture Authority | EVENT-IDEMPOTENCY-GOVERNANCE-ADR-1 | — | §8, §12, §15, §22 | **Partial** | Refines ADR-014: transport vs business idempotency; multi-pattern selection algorithm; mandatory consumer checklist |
| ADR-ARCH-022 | Order Settlement Platform | **Accepted** (rev 1.1) | Architecture Authority | ORDER-SETTLEMENT-ARCHITECTURE-1 · ORDER-SETTLEMENT-ARCHITECTURE-HARDENING-1 | — | Check / Order financial state (FSP) | **Not implemented** | Refines ADR-020: Check-owned Order Settlement entity; Check remains Revenue root; I-FIN-12 preserved; I-OS-14 no terminal→non-terminal regression |
| ADR-ARCH-023 | Financial Core Capabilities Architecture | **Accepted** | Architecture Authority | FINANCIAL-CORE-CAPABILITIES-ARCHITECTURE-1 | — | FSP Phase C shared language / ownership | **Not implemented** | Refines ADR-020/022: Payment, Allocation, Refund, Outstanding, Timeline constitution; no new monetary Aggregate Roots; preserves certified OS/Projection/API/Presentation |
| ADR-ARCH-024 | Split Payment Platform | **Accepted** | Architecture Authority | SPLIT-PAYMENT-ARCHITECTURE-1 | — | FSP multi-tender / incremental Payment | **Not implemented** | Refines ADR-023: Payment≠Aggregate Root; Payment Success≠Financial Settlement; OS remains settlement SSOT; Revenue unchanged |
| ADR-ARCH-025 | Multi Check Allocation Platform | **Accepted** | Architecture Authority | MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 | — | FSP cross-Check responsibility redistribution | **Not implemented** | Refines ADR-023/024: Allocation≠Aggregate Root; Check-commanded relationship facts; conserves I-FC/I-SP; Membership remains composition SSOT |
| ADR-ARCH-026 | Settlement Record Platform | **Accepted** | Architecture Authority | SETTLEMENT-RECORD-PLATFORM-1 · SETTLEMENT-RECORD-IMPLEMENTATION-1 · REFUND-SETTLEMENT-RECORD-ADOPTION-1 · REFUND-REPORTING-ADOPTION-1 | — | FSP Canonical Financial Document / Reporting publication | **Implemented (write + refund read + Reporting Net)** | Refines ADR-020/021/023: Settlement Record≠Aggregate Root; Check remains sole monetary authority; append-only immutable publication; SR-INV-01…10. Refund is native `recordKind`; Reporting Gross unchanged + Net from refund publications (REFUND-REPORTING-ADOPTION-1). |
| ADR-ARCH-027 | Operational Document Identity Standard | **Accepted** | Architecture Authority | OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1 | Ad-hoc document presentation formats | Cross-platform human document identity | **Partial** | Registry + Provider + Settlement adoption; Orders/Checks/Reporting/Printing/Notifications phased. Standard: `docs/architecture/standards/OPERATIONAL-DOCUMENT-IDENTITY-STANDARD.md` |
| ADR-ARCH-028 | Cash Register Management Platform (CRMP) | **Accepted** | Architecture Authority | CASH-REGISTER-MANAGEMENT-ARCHITECTURE-1 · CRMP-DOMAIN-DESIGN-1 · CRMP-IMPLEMENTATION-1 · REGISTER-OPERATIONS-IMPLEMENTATION-1 · CRMP-PRODUCTION-MIGRATION-0079 · CRMP-OPERATIONS-API-1 · REGISTER-OPERATIONS-UI-1 · REFUND-REGISTER-ADOPTION-1 | — | Register / Financial Shift / Drawer accountability / Settlement Attribution | **Partial (domain + Duty + API + UI + refund attribution)** | Domain + terminus `0079` + Operations API + Manager Register Ops UI certified. Refund SR attribution (custody/fail-open) via REFUND-REGISTER-ADOPTION-1. Check remains sole monetary AR (020); SR Check-published (026); no Cashier domain. |
| ADR-ARCH-030 | Financial Shift Operational Lifecycle Governance | **Accepted** | Architecture Authority | ADR-ARCH-030 · FINANCIAL-SHIFT-LIFECYCLE-1 · REGISTER-OPERATIONS-PLATFORM-1 · SHIFT-LIFECYCLE-IMPLEMENTATION-1 · REGISTER-OPERATIONS-IMPLEMENTATION-1 | — | Register Catalog/Duty · Financial Shift lifecycle · Settlement Attribution prerequisites | **Partial (domain)** | Refines ADR-028 lifecycle governance only. Shift lifecycle + Register Duty domain certified; API/UI pending. OpenRegister ≠ OpenFinancialShift; persisted Shift `pending` forbidden; settle fail-open w.r.t. Attribution; never invent operational context. Does not modify 020/022/026/028 ownership. |
| ADR-ARCH-031 | Data Retention & Archival Platform (DRAP) | **Accepted** (governance) | Architecture Authority | DATA-RETENTION-ARCHITECTURE-1 · DATA-RETENTION-PLATFORM-1 · FINANCIAL-SHIFT-RETENTION-ADOPTION-1 | — | Cross-cutting Display Window · Operational Retention · Cold Archive · Restore · Purge | **Partial (platform + Shift adoption)** | DRAP lib + Financial Shift display window/archive/report + human shiftNumber (`0081`). Cold store/purge not started. Settlement Records Permanent. Does not modify 020/022/026/028/030 ownership. |
| ADR-ARCH-032 | Refund Platform Architecture | **Accepted** | Architecture Authority | REFUND-PLATFORM-ARCHITECTURE-1 · REFUND-DOMAIN-IMPLEMENTATION-1 · REFUND-SETTLEMENT-RECORD-ADOPTION-1 · REFUND-REGISTER-ADOPTION-1 · REFUND-REPORTING-ADOPTION-1 · REFUND-PRESENTATION-ADOPTION-1 · REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 | — | FSP Refund capability / Settlement Ledger entry / compensating Settlement Records | **Implemented (domain + SR + Register + Reporting + Presentation + Operational workflow)** | Full stack certified including Settlement Ledger Refund action via CheckService façade. |
| ADR-ARCH-033 | Financial Custody Plane | **Accepted** | Architecture Authority | ADR-ARCH-033-FINANCIAL-CUSTODY-PLANE · FINANCIAL-CUSTODY-PLANE-1 · REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 | — | Custody governance / Authority≠Custody / Expected Cash / Attribution / RRS specialization | **Governance only** | Constitutionalizes Financial Custody Plane over CRMP (028/030). No new Aggregate Roots. Money remains Check (020). SR immutable (026). RRS-INV + `SettlementAttributed` completion ratified. FC-INV-01…17 · FC-REP-01…04. |
| ADR-ARCH-034 | Commercial Catalog Authority | **Accepted** (governance) | Architecture Authority | COMMERCIAL-ADR-REGISTRATION-1 · COMMERCIAL-CATALOG-ARCHITECTURE-1 · COMMERCIAL-PRICING-POLICY-UPDATE-1 | — | Live Plan catalog / entitlement template ≠ customer contract | **Governance only** | Rev 1.1: capabilities follow current Live Plan; price period lock is ADR-035. Catalog price edit must not rewrite Charged Terms. Does not modify Checkout, MRR code, Order, or Check Revenue (020). |
| ADR-ARCH-035 | Commercial Price Semantics | **Accepted** (governance) | Architecture Authority | COMMERCIAL-ADR-REGISTRATION-1 · COMMERCIAL-CATALOG-ARCHITECTURE-1 · COMMERCIAL-PRICING-POLICY-UPDATE-1 | — | List / checkout / charged / renewal / upgrade / downgrade prices | **Governance only** | Rev 1.1: New Checkout and Renewal use current Offer List Price; Charged Terms locked for the current period; no lifetime lock; I-PRICE-01…07, I-PRICE-10. `subscription_plans` remains legacy charge layer. Checkout cutover design remains **open**. |
| ADR-ARCH-036 | Commercial MRR Constitution | **Accepted** (governance) | Architecture Authority | COMMERCIAL-ADR-REGISTRATION-1 · COMMERCIAL-CATALOG-ARCHITECTURE-1 · COMMERCIAL-PRICING-POLICY-UPDATE-1 | — | Commercial recurring metric ≠ Check Revenue | **Governance only** | Rev 1.1: MRR follows current Charged Terms (I-PRICE-08/09); catalog edit during the period does not move MRR; Renewal that writes new Charged Terms does. FX policy and refund-to-binding remain **open**. Does not modify ADR-020. |
| ADR-ARCH-037 | Payment Process Domain | **Accepted** (governance) | Architecture Authority | PAYMENT-CONSTITUTIONAL-REFINEMENT-1 | — | FSP Payment process vs Check aggregate | **Governance only** | Refines 020/023/024/026/032. Payment = process owner; Check = sole monetary aggregate. One formula `computeCheckMoney`. Collection stays ST. No payments table. I-PAY-01…18. Does not rewrite I-FIN-*. Next code: PAYMENT-CONFIRM-SERVICE-1. |

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
| ADR-ARCH-020 | [ADR-ARCH-020-financial-settlement-platform.md](../adrs/ADR-ARCH-020-financial-settlement-platform.md) |
| ADR-ARCH-021 | [ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md](../adrs/ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) |
| ADR-ARCH-022 | [ADR-ARCH-022-order-settlement-platform.md](../adrs/ADR-ARCH-022-order-settlement-platform.md) |
| ADR-ARCH-023 | [ADR-ARCH-023-financial-core-capabilities.md](../adrs/ADR-ARCH-023-financial-core-capabilities.md) |
| ADR-ARCH-024 | [ADR-ARCH-024-split-payment-platform.md](../adrs/ADR-ARCH-024-split-payment-platform.md) |
| ADR-ARCH-025 | [ADR-ARCH-025-multi-check-allocation-platform.md](../adrs/ADR-ARCH-025-multi-check-allocation-platform.md) |
| ADR-ARCH-026 | [ADR-ARCH-026-settlement-record-platform.md](../adrs/ADR-ARCH-026-settlement-record-platform.md) |
| ADR-ARCH-027 | [ADR-ARCH-027-operational-document-identity.md](../adrs/ADR-ARCH-027-operational-document-identity.md) |
| ADR-ARCH-028 | [ADR-ARCH-028-cash-register-management-platform.md](../adrs/ADR-ARCH-028-cash-register-management-platform.md) |
| ADR-ARCH-030 | [ADR-ARCH-030-financial-shift-operational-lifecycle.md](../adrs/ADR-ARCH-030-financial-shift-operational-lifecycle.md) |
| ADR-ARCH-031 | [ADR-ARCH-031-data-retention-and-archival-platform.md](../adrs/ADR-ARCH-031-data-retention-and-archival-platform.md) |
| ADR-ARCH-032 | [ADR-ARCH-032-refund-platform.md](../adrs/ADR-ARCH-032-refund-platform.md) |
| ADR-ARCH-033 | [ADR-ARCH-033-financial-custody-plane.md](../adrs/ADR-ARCH-033-financial-custody-plane.md) |
| ADR-ARCH-034 | [ADR-ARCH-034-commercial-catalog-authority.md](../adrs/ADR-ARCH-034-commercial-catalog-authority.md) |
| ADR-ARCH-035 | [ADR-ARCH-035-commercial-price-semantics.md](../adrs/ADR-ARCH-035-commercial-price-semantics.md) |
| ADR-ARCH-036 | [ADR-ARCH-036-mrr-constitution.md](../adrs/ADR-ARCH-036-mrr-constitution.md) |
| ADR-ARCH-037 | [ADR-ARCH-037-payment-process-domain.md](../adrs/ADR-ARCH-037-payment-process-domain.md) |

**Related:** [Blueprint](../blueprints/Order-Centric-Architecture.md) · [ADR Lifecycle](../governance/ADR-Lifecycle.md)