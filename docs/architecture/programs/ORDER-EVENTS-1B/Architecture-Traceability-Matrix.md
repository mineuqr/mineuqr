# Architecture Traceability Matrix — ORDER-EVENTS-1B

| Requirement | Blueprint § | ADR | Implementation artifact (planned) | Test / FF | Status |
|---|---|---|---|---|---|
| Notification consumer | §12 | ADR-ARCH-004 | `OrderNotificationConsumer` | Consumer tests, FF-05 | Planned |
| Session consumer | §12 | ADR-ARCH-010 | `OrderSessionConsumer` | Consumer tests, FF-05 | Planned |
| Kitchen consumer (foundation) | §12 | ADR-ARCH-012 | `OrderKitchenConsumer` | Consumer tests | Planned |
| Printing consumer (foundation) | §12 | ADR-ARCH-012 | `OrderPrintingConsumer` | Consumer tests | Planned |
| Consumer registration | §8, §15 | ADR-ARCH-004, 008 | `OrderEventConsumerRegistry` + publisher hand-off | Registration tests | Planned |
| Registration Layer (ordering owner) | §15 | ADR-ARCH-014 | `OrderEventConsumerRegistry` declarative policy | Ordering matrix | Planned |
| Consumer independence (R1–R7) | §12, §15 | ADR-ARCH-014 | Per-consumer isolation + enable/disable | Independence matrix | Planned |
| Consumer ordering (P1–P4) | §15 | ADR-ARCH-014 | No ordering in Publisher/Consumers | Ordering matrix | Planned |
| Idempotent consumers | §8, §15 | ADR-ARCH-014 | `eventId` dedup store / handler guard | Idempotency tests | Planned |
| Failure isolation | §15 | ADR-ARCH-014 | Registration Layer per-consumer dispatch | Failure isolation tests | Planned |
| Consumer telemetry | §8 | ADR-ARCH-008 | `EventConsumerMetrics` extension | Metrics tests | Planned |
| Router cleanup — notifications | §13 | ADR-ARCH-004, 005 | Remove `createNotification` from `order.create` | Router cleanup tests | Planned |
| Router cleanup — push | §12 | ADR-ARCH-004 | Remove `sendReadyPushForOrder`, `cleanupPushSubscriptionsForOrder` | Router cleanup tests | Planned |
| Router cleanup — session writes | §12 | ADR-ARCH-010 | Remove `recordSessionEvent`, aggregate inc/dec | Router cleanup tests, FF-05 | Planned |
| Relay dispatch post-command | §15 | ADR-ARCH-008 | Composition hook → `runOrderEventRelayBatch` | Integration tests | Planned |
| ADR-ARCH-014 ratification | §8, §15 | ADR-ARCH-014 | `docs/architecture/adrs/ADR-ARCH-014.md` | Exit review | Planned |
| Consumer Independence Matrix | §15 | Amendment | `Consumer-Independence-Matrix.md` | Exit gate | Planned |
| Consumer Ordering Matrix | §15 | Amendment | `Consumer-Ordering-Matrix.md` | Exit gate | Planned |
| Outbox / relay redesign | — | — | — | — | Out of scope |
| Message broker | — | — | — | — | Out of scope |
| Kitchen UI | §12 | — | — | — | Out of scope |
| Printing UI / connector | §12 | — | — | — | Out of scope |
| Analytics consumer | §12 | ADR-ARCH-009 | — | Future | Out of scope |
| Read models / projections | §11 | ADR-ARCH-006 | — | ORDERS-WORKSPACE-1 | Out of scope |

---

## Architecture Amendment compliance

| Amendment rule set | Exit deliverable | Certification blocker |
|---|---|---|
| Consumer Independence R1–R7 | [Consumer-Independence-Matrix.md](./Consumer-Independence-Matrix.md) | Any rule fails for any Consumer |
| Consumer Ordering P1–P4 | [Consumer-Ordering-Matrix.md](./Consumer-Ordering-Matrix.md) | Ordering outside Registration Layer |
| Acyclic dependency graph | Independence Matrix § Dependency graph | Any Consumer → Consumer edge |

**Authority:** [Architecture-Amendment.md](./Architecture-Amendment.md)

---

| Violation | Remediation artifact | FF |
|---|---|---|
| CV-01 Inline session aggregate writes | `OrderSessionConsumer` | FF-05 |
| CV-02 Inline `createNotification` | `OrderNotificationConsumer` | FF-05 |
| CV-03 Inline ready push + subscription cleanup | `OrderNotificationConsumer` | FF-05 |
| CV-04 `TABLE_SESSION_DUAL_WRITE` divergent post-commit path | `OrderSessionConsumer` (flag-aware) | FF-05, FF-14 |

## ORDER-EVENTS-1A deferred item map

| EV ID | Item | 1B artifact |
|---|---|---|
| EV-01 | Consumer dispatch in publisher | Consumer registration mechanism |
| EV-02 | Router session/notification decoupling | Session + notification consumers + router cleanup |

---

## Event → consumer routing (planned)

| Domain event | Notification | Session | Kitchen | Printing |
|---|---|---|---|---|
| `OrderCreated` | ✓ owner alert | ✓ event + aggregate inc | ✓ hook | ✓ hook |
| `OrderStatusChanged` | — | — | ✓ hook | — |
| `OrderReady` | ✓ customer push | — | — | ✓ dispatch intent |
| `OrderCompleted` | ✓ push cleanup | — | — | — |
| `OrderCancelled` | ✓ push cleanup | ✓ aggregate dec | — | — |

---

**Compliance:** [Compliance-Checklist.md](../../governance/Compliance-Checklist.md)

**Prerequisites:** [ORDER-EVENTS-1A Architecture Exit Report](../ORDER-EVENTS-1A/Architecture-Exit-Report.md)
