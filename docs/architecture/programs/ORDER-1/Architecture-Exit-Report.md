# ORDER-1 — Architecture Exit Report

**Program:** ORDER-1 — Order Domain Implementation  
**Constitution:** MineuQR 2.0 Architecture Constitution v1.0.0  
**Report type:** Architecture Exit Review (permanent record)  
**Certification date:** 2026-06-27  
**Authority:** Architecture Authority  

**Related documents:**

- [Program Charter](./Program-Charter.md)
- [Architecture Traceability Matrix](./Architecture-Traceability-Matrix.md)
- [Implementation Report](./Implementation-Report.md)
- [Architecture Constitution v1.0](../../constitution/Architecture-Constitution-v1.0.md)

---

## 1. Executive Summary

### Objectives

ORDER-1 was chartered to extract the **Order Core Domain** from the router-centric baseline and establish the constitutional production path: Application Command → Aggregate + Policies → Repository → Commit → Domain Events.

### Scope

In scope: Order aggregate, entities, policies, domain services (via ports), repository, application services, domain events, error model, and mutation-path integration for `order.create` and `order.updateStatus`.

Out of scope: Kitchen, Printing, Session redesign, Notifications domain, Analytics, Dashboard read models, event consumers, outbox relay, ACL package extraction.

### Major architectural achievements

1. **`server/order/` bounded context** introduced with constitutional layering (domain, application, repositories, infrastructure).
2. **Order Aggregate** (`Order` + `OrderLine`) enforces lifecycle, immutability, and terminal-state invariants.
3. **Four policies** operational: lifecycle, modification, cancellation, visibility.
4. **Repository port + Drizzle implementation** with optimistic concurrency on `updatedAt` (ADR-ARCH-011).
5. **Application services** (`PlaceOrderService`, `AdvanceOrderStatusService`) orchestrate mutations without embedding business rules.
6. **Domain events** defined and emitted post-commit (in-process; persistence deferred).
7. **Router strangler** — create and status mutations delegate to application layer; queries unchanged.

### Overall outcome

ORDER-1 **achieved its chartered domain foundation objectives**. Constitutional compliance is **substantial but not complete** due to pre-existing inline integration side effects in the order router (session, notifications, push), explicitly deferred to ORDER-EVENTS-1 per Program Charter conditional certification terms.

**Exit verdict:** PASS WITH DEFERRED ITEMS

---

## 2. Program Scope Verification

### Implemented (confirmed)

| Deliverable | Evidence | Status |
|---|---|---|
| Order Aggregate | `server/order/domain/aggregate/Order.ts` | ✓ |
| Aggregate Root | `Order` root controls lifecycle and lines | ✓ |
| Domain Entities | `OrderLine` entity | ✓ |
| Value Objects | `OrderStatus`, `OrderActor` | ✓ |
| Policies | `OrderLifecyclePolicy`, `OrderModificationPolicy`, `OrderCancellationPolicy`, `OrderVisibilityPolicy` | ✓ |
| Repository Layer | `OrderRepository` interface + `DrizzleOrderRepository` | ✓ |
| Application Layer | `PlaceOrderService`, `AdvanceOrderStatusService` | ✓ |
| Domain Events | `OrderDomainEvents.ts`; aggregate emits after save | ✓ |
| Error Model | `OrderDomainErrors.ts` + `mapOrderDomainError.ts` | ✓ |
| Production Path | `order.create` / `order.updateStatus` → application → aggregate → repository | ✓ (mutations) |

### Intentionally NOT implemented (confirmed)

| Exclusion | Status |
|---|---|
| Printing | ✓ Not implemented (RESET-1 retired) |
| Kitchen | ✓ Not implemented |
| Session redesign | ✓ Not implemented (inline dual-write retained) |
| Analytics | ✓ Not implemented |
| Dashboard redesign | ✓ Not implemented |
| Read Models | ✓ Not implemented (queries use existing `db.ts`) |
| Event Consumers | ✓ Not implemented |
| Connectors | ✓ Not implemented |
| Outbox / event relay | ✓ Deferred ORDER-EVENTS-1 |

### Scope deviations

| Deviation | Classification |
|---|---|
| Restaurant/commercial/table **gates** remain in `orderRouter` rather than ACL modules | **Acceptable** — adapter-layer orchestration; ACL extraction deferred (not ORDER-1 charter) |
| `CancelOrderService` not a separate class; cancel routed via `AdvanceOrderStatusService` | **Acceptable** — same application pattern; cancel is lifecycle transition |
| Repository delegates to existing `db.ts` helpers | **Acceptable** — infrastructure transition; no domain leakage |
| Test file updates for new repository call chain | **In scope** — verification support, not feature scope |

**No unauthorized scope expansion detected.**

---

## 3. Architecture Traceability Matrix

Official ORDER-1 traceability. Every implemented artifact maps Implementation → Blueprint § → ADR → Constitution.

| Implementation artifact | Blueprint § | ADR | Constitution |
|---|---|---|---|
| `Order` aggregate | §3, §4, §6 | ADR-ARCH-001, 007 | Part I §3; North Star (Order sovereignty); §20 |
| `OrderLine` entity | §3, §4 | ADR-ARCH-007 | Part I §3 |
| `OrderStatus` VO | §4, §5 | ADR-ARCH-007 | Part I §5 |
| `OrderActor` VO | §5, §7 | ADR-ARCH-003, 007 | Part I §7; §23 |
| `OrderLifecyclePolicy` | §5, §7 | ADR-ARCH-001, 007 | Part I §5–7; §24 FF-08 |
| `OrderModificationPolicy` | §7, §6 (INV-03) | ADR-ARCH-007 | Part I §7 |
| `OrderCancellationPolicy` | §5, §7 | ADR-ARCH-007 | Part I §7 |
| `OrderVisibilityPolicy` | §7, §11 (public projection) | ADR-ARCH-003, 006 | Part I §7; §24 FF-11 |
| `OrderDomainEvents` | §8 | ADR-ARCH-004, 008 | Part I §8; §24 FF-09 (partial) |
| `OrderDomainErrors` | §23 | ADR-ARCH-007, 011 | Part II §23 |
| `OrderPricingPort` + adapter | §6, §9 | ADR-ARCH-002 | Part I §6; §21 (ACL deferred) |
| `OrderNumberPort`, `TrackingTokenPort` | §3, §10 | ADR-ARCH-002 | Part I §3, §10 |
| `OrderRepository` (interface) | §10 | ADR-ARCH-007 | Part I §10; §19–20 |
| `DrizzleOrderRepository` | §10 | ADR-ARCH-007, 011 | Part I §10; §19 |
| `OrderMapper` | §10 | ADR-ARCH-007 | Part I §10 |
| `PlaceOrderService` | §9, §13 | ADR-ARCH-001, 005, 007 | Part I §13; §28 |
| `AdvanceOrderStatusService` | §9, §13 | ADR-ARCH-001, 005, 007 | Part I §13 |
| `mapOrderDomainError` | §23 | ADR-ARCH-007 | Part II §23 |
| `composition.ts` / `placeOrderComposition.ts` | §20 | ADR-ARCH-013 | Part II §20 |
| Router wiring (`order.create`, `order.updateStatus`) | §13, §14 | ADR-ARCH-005 | Part I §13; §28 |
| Domain unit tests | §6, §7, §8 | ADR-ARCH-007 | §24; §28 |

### Missing traceability

| Item | Note |
|---|---|
| Dedicated ACL modules (`CommercialACL`, etc.) | Not implemented — traceability reserved for ORDER-1B/follow-on |
| Outbox table / relay | Not implemented — ORDER-EVENTS-1 |
| `CancelOrderService` (standalone) | Covered by `AdvanceOrderStatusService` — no gap |

---

## 4. Constitution Compliance Review

### Architecture Principles (North Star / §1)

| Principle | Compliance | Notes |
|---|---|---|
| Order remains operational center | **Compliant** | Aggregate owns mutations |
| Bounded contexts | **Compliant** | `server/order/` introduced |
| One business rule owner | **Partial** | Policies own rules; gates still in router |
| One object authority | **Compliant** for writes | Reads still via `db.ts` |
| Events/contracts for integration | **Partial** | Events emitted; consumers inline (deferred) |
| Evolve by adding domains | **Compliant** | No Order scope creep |
| Long-term over convenience | **Compliant** | Domain extraction over router shortcuts |

### Dependency Rules (§19)

| Rule | Compliance |
|---|---|
| Domain depends on nothing | **Compliant** — no SQL, no infrastructure imports in `domain/` |
| Infrastructure business-unaware | **Compliant** — persistence mapping only |
| Application orchestrates without rules | **Compliant** |
| Presentation renders only | **Partial** — Dashboard KPI math unchanged (ORDERS-WORKSPACE-1) |

### Package Rules (§20)

| Rule | Compliance |
|---|---|
| `server/order/` package tree | **Compliant** — domain, application, repositories, infrastructure |
| Dependencies inward to domain | **Compliant** |
| Full §20 folder tree (commands/, acl/) | **Partial** — logical minimum for ORDER-1 |

### Aggregate Rules (§3, §6, §7)

| Rule | Compliance |
|---|---|
| Sole mutation authority | **Compliant** for create/status |
| Invariants enforced | **Compliant** |
| Terminal states final | **Compliant** |
| Immutable lines post-create | **Compliant** |

### Policy Rules (§7)

| Rule | Compliance |
|---|---|
| Policies pure (no I/O) | **Compliant** |
| Lifecycle/cancel/modification isolated | **Compliant** |

### Production Path (§13)

| Rule | Compliance |
|---|---|
| Command → Application → Aggregate → Repository → Events | **Compliant** for mutations |
| No router → DB insert for order state | **Compliant** |
| Inline notification/session in write path | **Non-compliant** — deferred ORDER-EVENTS-1 |

### Governance & Compliance (§26–28)

| Rule | Compliance |
|---|---|
| Program charter + ATM | **Compliant** |
| Traceability documented | **Compliant** |
| Exit review (this document) | **Compliant** |
| Architecture exception filed | **N/A** — conditional certification via charter |

### Constitutional violations (open)

| ID | Violation | Severity | Remediation |
|---|---|---|---|
| CV-01 | Inline session aggregate writes in `order.create` / `order.updateStatus` | **High** | ORDER-EVENTS-1 (ADR-ARCH-010) |
| CV-02 | Inline `createNotification` in `order.create` | **High** | ORDER-EVENTS-1 (ADR-ARCH-004) |
| CV-03 | Inline `sendReadyPushForOrder` in `order.updateStatus` | **Medium** | ORDER-EVENTS-1 |
| CV-04 | `TABLE_SESSION_DUAL_WRITE` divergent path | **High** | ORDER-EVENTS-1 (ADR-ARCH-005) |
| CV-05 | Client dashboard KPI computation | **Medium** | ORDERS-WORKSPACE-1 (ADR-ARCH-006/009) — out of ORDER-1 scope |

**No constitutional redesign required.** Violations are **known baseline debt** with assigned programs.

---

## 5. ADR Compliance

| ADR | Status | Justification |
|---|---|---|
| **ADR-ARCH-001** Order as Core Domain | **Partially Implemented** | Domain module exists; mutations via aggregate; queries still router/db |
| **ADR-ARCH-002** Single Source of Truth | **Partially Implemented** | Server pricing via port; client KPIs not addressed (out of scope) |
| **ADR-ARCH-003** Service Ownership Boundaries | **Partially Implemented** | Aggregate boundaries clear; inline session/notification violate integration rules |
| **ADR-ARCH-004** Event-Driven Integration | **Deferred** | Events defined/emitted; consumers not event-driven |
| **ADR-ARCH-005** Production Path Authority | **Partially Implemented** | Single mutation path; dual-write flag remains |
| **ADR-ARCH-006** UI as Presentation Only | **Deferred** | Dashboard unchanged (ORDERS-WORKSPACE-1) |
| **ADR-ARCH-007** Order Aggregate Authority | **Implemented** | Aggregate + policies enforce all order mutations |
| **ADR-ARCH-008** Order Outbox and Event Relay | **Deferred** | ORDER-EVENTS-1 |
| **ADR-ARCH-009** Read Models Own Analytics | **Deferred** | ORDERS-WORKSPACE-1 |
| **ADR-ARCH-010** Session via Order Events Only | **Deferred** | ORDER-EVENTS-1 |
| **ADR-ARCH-011** Optimistic Concurrency | **Implemented** | `updatedAt` check on repository save |
| **ADR-ARCH-012** Printing/Kitchen as Consumers | **Not Applicable** | RESET-1 retired; no kitchen/print in ORDER-1 |
| **ADR-ARCH-013** Constitution & Governance | **Implemented** (governance) | Program charter, ATM, exit report; engineering partial |

---

## 6. Architecture Fitness Function Verification

| FF | Rule | Result | Notes |
|---|---|---|---|
| FF-01 | No SQL in domain | **PASS** | |
| FF-02 | No infrastructure imports in domain | **PASS** | |
| FF-03 | No `@commercial/*` in domain | **PASS** | |
| FF-04 | `orders.status` via Application Service | **PASS** | create + updateStatus |
| FF-05 | No notification/session in order router | **FAIL** | CV-01, CV-02 — ORDER-EVENTS-1 |
| FF-06 | No client revenue aggregation | **FAIL** (pre-existing) | ORDERS-WORKSPACE-1 |
| FF-07 | Guest create ignores client price | **PASS** | |
| FF-08 | Lifecycle server-side | **PASS** | Policy + domain tests |
| FF-09 | OrderCreated to outbox same transaction | **FAIL** | ORDER-EVENTS-1 |
| FF-10 | Terminal states reject advances | **PASS** | Domain tests |
| FF-11 | Public status no internal orderId | **PASS** | `toPublicOrderStatus` unchanged |
| FF-12 | Commercial gate on PlaceOrder | **PASS** | Router gate before service |
| FF-13 | No session/order total drift without reconciliation | **FAIL** (pre-existing) | ORDER-EVENTS-1 |
| FF-14 | No cross-domain writes in one procedure | **FAIL** | Session/notification inline in `order.create` |
| FF-15 | Read models from projectors not UI | **FAIL** (pre-existing) | ORDERS-WORKSPACE-1 |
| FF-16 | One owner per business rule | **PASS** (in-scope rules) | |
| FF-17 | One subscriber per integration effect | **FAIL** | Inline handlers — ORDER-EVENTS-1 |
| FF-18 | No printing without PRINTING-1 | **PASS** | RESET-1 baseline |

### Summary

- **PASS:** 10 fitness functions  
- **FAIL (deferred):** 8 fitness functions (6 pre-existing + 2 newly scoped for ORDER-EVENTS-1)  
- **In-scope ORDER-1 failures:** FF-05, FF-09, FF-14, FF-17 — all assigned ORDER-EVENTS-1

---

## 7. Deferred Register

| Deferred Item | Reason | Target Program | Architectural Justification |
|---|---|---|---|
| Transactional outbox | ORDER-1 scope = domain foundation only | **ORDER-EVENTS-1** | ADR-ARCH-008; §8 requires outbox post-domain extraction |
| Event relay / dispatcher | Depends on outbox | **ORDER-EVENTS-1** | ADR-ARCH-004 durable integration |
| Notification consumers | Requires event transport | **ORDER-EVENTS-1** | §12; ADR-ARCH-004 — retire inline `createNotification` |
| Session consumers | Requires event transport | **ORDER-EVENTS-1** | ADR-ARCH-010; retire dual-write |
| Push ready consumer | Side effect, not domain | **ORDER-EVENTS-1** | Event-driven vs inline `sendReadyPushForOrder` |
| Printing consumers | Future fulfillment | **PRINTING-1** | ADR-ARCH-012; RESET-1 re-entry only via events |
| Kitchen consumers | Future fulfillment | **KITCHEN-DISPLAY-1** | ADR-ARCH-012 |
| Read models (owner list/detail, KPIs) | Separate projection concern | **ORDERS-WORKSPACE-1** | ADR-ARCH-009; §11 |
| Analytics projections | Generic integration context | **Analytics program** | §2 domain landscape |
| ACL package extraction | Supporting domain adapters | **ORDER-1B** (optional) | §21 — gates currently in router adapter |
| Retire `TABLE_SESSION_DUAL_WRITE` | Requires session event path | **ORDER-EVENTS-1** | ADR-ARCH-005 certified path |

**Deferral compliance:** Constitution §25 evolution rules and Program Charter out-of-scope list authorize phased delivery. ORDER-1 delivered the **core domain** without absorbing integration contexts — consistent with North Star (“capabilities through bounded contexts, not enlarged Order”).

---

## 8. Repository Impact

### Files added (21 + program docs)

```
server/order/
├── application/          (3 files)
├── composition.ts
├── placeOrderComposition.ts
├── domain/               (aggregate, policies, events, errors, ports, VOs, tests)
├── infrastructure/       (adapters, persistence)
└── repositories/

docs/architecture/programs/ORDER-1/
├── Program-Charter.md
├── Architecture-Traceability-Matrix.md
├── Implementation-Report.md
└── Architecture-Exit-Report.md (this document)
```

### Files modified

| File | Change |
|---|---|
| `server/routers.ts` | `order.create` / `order.updateStatus` delegate to application services |
| `server/order-create-pricing.test.ts` | (unchanged functionally if only others modified) |
| `server/order-update-status-ready-at.test.ts` | Mock extensions for repository chain |
| `server/order-update-status-cancellation-aggregates.test.ts` | Mock extensions |
| `server/order-get-public-status.test.ts` | Mock extension for composition import |

### Modules / packages introduced

| Package | Role |
|---|---|
| `server/order/domain` | Aggregate, policies, events, errors — zero outward deps |
| `server/order/application` | Orchestration only |
| `server/order/repositories` | Persistence port |
| `server/order/infrastructure` | Drizzle + adapters |

### Boundary verification

| Check | Result |
|---|---|
| Domain imports only domain | ✓ |
| No Order logic in `shared/` | ✓ |
| No printing/kitchen modules added | ✓ |
| Commercial not absorbed into Order | ✓ |
| `client/` unchanged for ORDER-1 | ✓ |

**No architectural boundary violations introduced.** Pre-existing cross-context router coupling documented as debt (CV-01–04).

---

## 9. Testing Summary

| Suite | Result | Notes |
|---|---|---|
| TypeScript (`npm run check`) | **PASS** | Verified at exit review |
| Order domain tests (`server/order/domain/__tests__/`) | **7/7 PASS** | Lifecycle, terminal, events |
| Order integration tests | **43/43 PASS** | pricing, tracking, session dual-write, status, public status |
| Commercial tests | Not re-run in exit review | Unaffected by ORDER-1 scope |
| Build (`npm run build`) | Not re-run in exit review | TypeScript clean |

### Architecture validation

| Validation | Result |
|---|---|
| Traceability matrix complete | ✓ |
| Scope verification | ✓ |
| Constitutional violation register | ✓ (documented) |
| Deferred register | ✓ |
| ADR status per registry | Pending registry update post-certification |

---

## 10. Technical Debt Register

*Architectural debt only.*

| ID | Debt | Severity | Target Program |
|---|---|---|---|
| TD-01 | Inline session aggregate writes in order router | **Critical** | ORDER-EVENTS-1 |
| TD-02 | `TABLE_SESSION_DUAL_WRITE` divergent production path | **Critical** | ORDER-EVENTS-1 |
| TD-03 | No transactional outbox for domain events | **Critical** | ORDER-EVENTS-1 |
| TD-04 | Inline notification creation on order create | **High** | ORDER-EVENTS-1 |
| TD-05 | Commercial/restaurant/table gates in router vs ACL | **High** | ORDER-1B |
| TD-06 | Repository uses legacy `db.ts` helpers vs native Drizzle transaction | **Medium** | ORDER-EVENTS-1 or ORDER-1B |
| TD-07 | Client dashboard computes order statistics | **High** | ORDERS-WORKSPACE-1 |
| TD-08 | Query path bypasses read models | **Medium** | ORDERS-WORKSPACE-1 |
| TD-09 | Domain events not persisted (lost on process crash) | **High** | ORDER-EVENTS-1 |
| TD-10 | `application/commands/` package not materialized | **Low** | Optional cleanup |

---

## 11. Risks

### Current architectural risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Session–Order coupling regression | Medium | High | ORDER-EVENTS-1 charter; FF-05/14 CI guards |
| Event loss without outbox | Medium | High | ORDER-EVENTS-1 priority |
| Concurrent status conflict UX | Low | Medium | ADR-ARCH-011 implemented; UI retry deferred |

### Deferred risks

| Risk | Mitigation |
|---|---|
| ORDER-EVENTS-1 scope creep into Order aggregate | Strict §25 placement rules in charter |
| Read model program duplicates client logic incorrectly | ORDERS-WORKSPACE-1 must cite ADR-ARCH-009 |

### Future integration risks

| Risk | Mitigation |
|---|---|
| PRINTING-1 / KITCHEN-DISPLAY-1 bypass events | ADR-ARCH-012 consumer-only pattern |
| Analytics reads raw `orders` table indefinitely | Define projection ownership in analytics program |

---

## 12. Readiness Assessment — ORDER-EVENTS-1

### Prerequisites from ORDER-1

| Prerequisite | Status |
|---|---|
| Order Aggregate exists | ✓ |
| Domain events defined | ✓ |
| Repository save boundary | ✓ |
| Application services as integration anchor | ✓ |
| Mutation path stable | ✓ |
| Tests green | ✓ |

### Conditions

| Condition | Status |
|---|---|
| Deferred register accepted | ✓ |
| CV-01–04 assigned to ORDER-EVENTS-1 | ✓ |
| No blocking FAIL on domain foundation | ✓ |

### Verdict

## **READY WITH CONDITIONS**

ORDER-EVENTS-1 may proceed immediately. **Conditions:**

1. ORDER-EVENTS-1 charter must cite ADR-ARCH-004, 005, 008, 010 and CV-01–04.
2. No Order aggregate changes unless ADR-amended.
3. Outbox must be atomic with repository commit (FF-09).

---

## 13. Architecture Authority Recommendation

## **PASS WITH DEFERRED ITEMS**

### Rationale

**PASS** because ORDER-1 delivered the chartered **Order domain foundation**:

- Aggregate is the mutation authority for create and lifecycle changes.
- Policies, invariants, and domain errors are operational and tested.
- Repository and application layers respect constitutional dependency rules.
- Production path for mutations is established.

**WITH DEFERRED ITEMS** because known **pre-existing and anticipated** integration debt remains:

- Inline session, notification, and push side effects (ADR-ARCH-004, 005, 010).
- No outbox (ADR-ARCH-008).
- Read models and UI KPIs (ADR-ARCH-006, 009) explicitly out of scope.

These deferrals are **constitutionally authorized** by Program Charter conditional certification and §25 evolution rules. They do **not** invalidate ORDER-1 domain delivery.

**FAIL would be warranted** only if the aggregate were bypassed, policies were absent, or scope expanded into printing/kitchen — none occurred.

---

## 14. Certification Statement

---

### Architecture Authority Certification — ORDER-1

| Field | Value |
|---|---|
| **Program name** | ORDER-1 — Order Domain Implementation |
| **Completion status** | **Implementation Complete — Conditionally Certified** |
| **Architecture compliance** | **Substantial** — domain foundation compliant; integration path partial |
| **Constitution compliance** | **Conditional** — CV-01–05 documented with remediation programs |
| **Approved ADRs (implemented in scope)** | ADR-ARCH-007 (full), ADR-ARCH-011 (full), ADR-ARCH-001/002/003/005 (partial) |
| **Approved ADRs (deferred)** | ADR-ARCH-004, 006, 008, 009, 010 |
| **Not applicable** | ADR-ARCH-012 |
| **Governance** | ADR-ARCH-013 (program documentation complete) |
| **Deferred programs** | ORDER-EVENTS-1 (required), ORDERS-WORKSPACE-1, ORDER-1B (optional), KITCHEN-DISPLAY-1, PRINTING-1 (future) |
| **Next authorized program** | **ORDER-EVENTS-1** |
| **Certification date** | **2026-06-27** |

### Official statement

The Architecture Authority hereby certifies that **ORDER-1 — Order Domain Implementation** has completed its chartered scope and established the **Order bounded context** as the authoritative mutation layer for MineuQR 2.0 order state, in accordance with the **MineuQR 2.0 Architecture Constitution v1.0.0**.

Conditional certification is granted subject to remediation of documented violations **CV-01 through CV-04** under **ORDER-EVENTS-1**. No further Order domain extraction is required before ORDER-EVENTS-1 begins.

This report is the **permanent architectural closure record** for ORDER-1 and serves as the template for future implementation program exit reviews.

---

**Architecture Authority Verdict:** PASS WITH DEFERRED ITEMS

**Signed:** Architecture Authority (ratified governance process)

**END OF ORDER-1 ARCHITECTURE EXIT REPORT**
