# Program Charter — ORDER-EVENTS-1B

| Field | Value |
|---|---|
| **Program** | ORDER-EVENTS-1B — Event Consumers |
| **Type** | Implementation |
| **Authority** | Architecture Authority |
| **Constitution version** | 1.0.0 |
| **Prerequisites** | ORDER-1 (certified), ORDER-EVENTS-1A (certified) |
| **Start date** | 2026-06-27 |
| **Target exit** | ORDER-EVENTS-1B exit review |

## Mission

Replace **inline router operational side-effects** with **event-driven consumers** that subscribe exclusively through the ORDER-EVENTS-1A event infrastructure (transactional outbox → relay → publisher → registered consumers).

No infrastructure redesign. No message-broker migration. Consumers implement integration only.

**Architecture Amendment (mandatory):** [Architecture-Amendment.md](./Architecture-Amendment.md) — Consumer Independence and Consumer Ordering rules are official Exit Criteria and permanent compliance requirements.

## Program objectives

1. **Remediate ORDER-1 constitutional violations CV-01–CV-04** via event consumers (ADR-ARCH-004, ADR-ARCH-010).
2. Implement **OrderNotificationConsumer**, **OrderSessionConsumer**, **OrderKitchenConsumer**, and **OrderPrintingConsumer** as independent subscribers.
3. Establish **central consumer registration** — Registration Layer owns dispatch and declarative ordering; publisher remains transport-only.
4. **Remove operational side-effects** from `order.create` and `order.updateStatus` routers.
5. Deliver **idempotent, failure-isolated** consumer execution with telemetry.
6. **Ratify ADR-ARCH-014** (Event Delivery Guarantees) validated against completed implementation.
7. Restore **FF-05** (no notification/session operational logic in order router).

## Scope

| In scope | Out of scope |
|---|---|
| `OrderNotificationConsumer` | Dashboard / Workspace UI |
| `OrderSessionConsumer` | Kitchen UI |
| `OrderKitchenConsumer` (integration foundation) | Printing UI |
| `OrderPrintingConsumer` (integration foundation) | Printer Connector |
| Consumer registration mechanism | Analytics Dashboard |
| Registration Layer (ordering + isolation) | Read models / projections |
| Consumer idempotency + telemetry | Projection optimization |
| Consumer independence + ordering validation | Infrastructure redesign |
| Router operational side-effect removal | Message broker migration |
| Minimal publisher extension for registration hand-off only | ORDER-EVENTS-1A relay/outbox schema redesign |
| Consumer tests | |
| ADR-ARCH-014 (exit deliverable) | |

### Router cleanup targets (ORDER-1 deferred violations)

| ID | Current inline behaviour | Target consumer | Router location |
|---|---|---|---|
| CV-02 | `createNotification` on order create | `OrderNotificationConsumer` ← `OrderCreated` | `server/routers.ts` ~L1942–1955 |
| CV-03 | `sendReadyPushForOrder` on ready transition | `OrderNotificationConsumer` ← `OrderReady` | `server/routers.ts` ~L2011–2020 |
| CV-03b | `cleanupPushSubscriptionsForOrder` on served/cancelled | `OrderNotificationConsumer` ← `OrderCompleted` / `OrderCancelled` | `server/routers.ts` ~L2023–2028 |
| CV-01 | `recordSessionEvent` on order create | `OrderSessionConsumer` ← `OrderCreated` | `server/routers.ts` ~L1886–1915 |
| CV-01 | `incrementSessionAggregatesForOrder` on order create | `OrderSessionConsumer` ← `OrderCreated` | `server/routers.ts` ~L1916–1940 |
| CV-01 | `decrementSessionAggregatesForCancelledOrder` on cancel | `OrderSessionConsumer` ← `OrderCancelled` | `server/routers.ts` ~L2031–2061 |
| CV-04 | `TABLE_SESSION_DUAL_WRITE` post-commit paths | Consumers honour flag; single event path | Same blocks |

**Post-create orchestration note:** `resolveSessionForOrderCreate` (pre-command session attach) remains request orchestration required to populate `sessionId` on the aggregate before persist. It is **not** a post-commit side-effect and is outside consumer scope unless extracted to an application orchestrator in a follow-on program.

### Kitchen and printing scope

| Consumer | Events (initial) | Behaviour |
|---|---|---|
| `OrderKitchenConsumer` | `OrderCreated`, `OrderStatusChanged` | Prepare kitchen integration hooks; ops telemetry only — **no KDS UI** |
| `OrderPrintingConsumer` | `OrderCreated`, `OrderReady` | Dispatch print-request intent via existing print architecture ports — **no printer connector, no print redesign** (RESET-1 baseline; `print_jobs` tables retired) |

## Constitutional references

- [Architecture Constitution v1.0](../../constitution/Architecture-Constitution-v1.0.md) §8, §12, §13, §19–20, §22, §28
- [Compliance §28](../../constitution/Compliance.md)
- [North Star](../../constitution/North-Star.md) — Order sovereignty; integration via events
- [ORDER-1 Exit Report](../ORDER-1/Architecture-Exit-Report.md) — CV-01–CV-04 remediation mandate
- [ORDER-EVENTS-1A Exit Report](../ORDER-EVENTS-1A/Architecture-Exit-Report.md) — EV-01, EV-02 deferred items

## Blueprint references

| § | Subject |
|---|---|
| §8 | Domain Events Architecture |
| §12 | Integration Architecture (Notifications, Session, Kitchen, Printing) |
| §13 | Production Path Authority |
| §15 | Event publication and consumer sequence |
| §22 | Domain / payload versioning |
| §24 | Fitness Functions (FF-05 target) |

## Applicable ADRs

| ADR | Role in 1B |
|---|---|
| ADR-ARCH-004 | **Primary** — Event-driven integration; retire sync side effects |
| ADR-ARCH-008 | Consumers must use outbox → relay → publisher path only |
| ADR-ARCH-010 | **Primary** — Session integration via Order events |
| ADR-ARCH-012 | Kitchen and printing as event consumers (foundation) |
| ADR-ARCH-005 | Production path; router thinned to validate → command → respond |
| ADR-ARCH-007 | Consumers must not mutate Order aggregate |
| ADR-ARCH-011 | Unchanged — optimistic concurrency on order root |
| ADR-ARCH-003 | Service ownership boundaries restored |
| **ADR-ARCH-014** | **Produced and ratified at exit** — Event Delivery Guarantees |

**Not in scope:** ADR-ARCH-006 (read models), ADR-ARCH-009 (analytics dashboard).

## Architecture Traceability Matrix

See [Architecture-Traceability-Matrix.md](./Architecture-Traceability-Matrix.md).

## Architecture Amendment (mandatory exit validation)

See [Architecture-Amendment.md](./Architecture-Amendment.md).

| Exit deliverable | Document |
|---|---|
| Consumer Independence Matrix | [Consumer-Independence-Matrix.md](./Consumer-Independence-Matrix.md) |
| Consumer Ordering Matrix | [Consumer-Ordering-Matrix.md](./Consumer-Ordering-Matrix.md) |

## Entry criteria

- [x] ORDER-1 certified (PASS WITH DEFERRED ITEMS)
- [x] ORDER-EVENTS-1A certified (PASS)
- [x] Transactional outbox operational (`order_domain_outbox`, `DrizzleOutboxRepository`)
- [x] Event envelope, serializer, relay, publisher foundation in place
- [x] Domain events defined (`OrderDomainEvents.ts`)
- [x] CV-01–CV-04 documented with remediation path to ORDER-EVENTS-1B
- [x] Program charter approved (this document)

## Exit criteria

### Functional

- [ ] `OrderNotificationConsumer` operational; inline notification/push removed from router
- [ ] `OrderSessionConsumer` operational; post-commit session writes removed from router
- [ ] `OrderKitchenConsumer` operational (integration foundation, no UI)
- [ ] `OrderPrintingConsumer` operational (print-request dispatch, no connector redesign)
- [ ] **Registration Layer** wired; publisher has no hardcoded consumer list and no execution ordering
- [ ] Consumers idempotent (`eventId` deduplication); failure isolation per consumer
- [ ] Consumer telemetry (execution, failure, latency, retry, success rate)
- [ ] Post-commit relay dispatch at composition boundary (consumers receive events without router involvement)
- [ ] **FF-05 PASS** — no operational notification/session side-effects in order router
- [ ] Consumer + router cleanup + registration tests pass
- [ ] **ADR-ARCH-014** ratified with implementation evidence
- [ ] Architecture Exit Report delivered

### Architecture Amendment (certification blockers)

- [ ] [Consumer Independence Matrix](./Consumer-Independence-Matrix.md) — all rules R1–R7 **Pass** for every Consumer
- [ ] [Consumer Ordering Matrix](./Consumer-Ordering-Matrix.md) — prohibitions P1–P4 **Pass**; ordering owned by Registration Layer only
- [ ] No Consumer imports, invokes, or depends on another Consumer
- [ ] No shared mutable state between Consumers
- [ ] Consumer dependency graph is **acyclic** (zero inter-consumer edges)
- [ ] Every Consumer independently enable/disable via registration config

**Cannot certify if:** any Consumer calls another Consumer; Publisher or Consumers contain execution ordering; shared mutable state exists between Consumers.

## Risks

| Risk | Mitigation |
|---|---|
| Duplicate delivery causes double notifications | Idempotent consumer execution keyed on `eventId` |
| Consumer failure blocks relay batch | Failure isolation — one consumer error must not abort others |
| Test mocks bypass outbox (legacy repository path) | Consumer unit tests with envelope fixtures; integration tests with relay + registration |
| `TABLE_SESSION_DUAL_WRITE` flag divergence | Session consumer centralises dual-write behaviour |
| Print tables retired (RESET-1) | Printing consumer uses port/adapter pattern; no schema redesign |
| Relay not invoked after mutation | Wire `runOrderEventRelayBatch` at composition boundary post-command |
| Pre-create `resolveSessionForOrderCreate` remains in router | Document as orchestration prerequisite; post-commit writes moved to consumer |

## Out of scope

Dashboard, Workspace, Kitchen UI, Printing UI, Printer Connector, Analytics Dashboard, read models, projection optimization, infrastructure redesign, message broker migration, analytics consumer, ACL package extraction, commercial gate relocation.

## Certification target

**Certified** when:

1. Every operational side-effect listed in CV-01–CV-04 is handled by a registered consumer
2. Routers contain no operational side-effects
3. Consumers use ORDER-EVENTS-1A infrastructure exclusively
4. ADR-ARCH-014 is ratified
5. **Consumer Independence Verification** and **Consumer Ordering Verification** pass completely (Architecture Amendment)

Amendment rules become permanent compliance requirements for all future Event Consumers.

---

**Certification:** [Program-Certification.md](../../governance/Program-Certification.md)
