# Architecture Traceability Matrix — ORDER-EVENTS-1B

| Requirement | Blueprint § | ADR | Implementation artifact | Test / FF | Status |
|---|---|---|---|---|---|
| Consumer registration | §8, §15 | ADR-ARCH-014 | `OrderEventConsumerRegistry` | `OrderEventConsumerRegistry.test.ts` | Implemented |
| Notification consumer | §12 | ADR-ARCH-004, 014 | `OrderNotificationConsumer` | Consumer + router cleanup tests | Implemented |
| Session consumer | §12 | ADR-ARCH-010, 014 | `OrderSessionConsumer` | Consumer + router cleanup tests | Implemented |
| Kitchen consumer | §12 | ADR-ARCH-012 | `OrderKitchenConsumer` | `OrderKitchenConsumer.test.ts` | Implemented |
| Printing consumer | §12 | ADR-ARCH-012 | `OrderPrintingConsumer` + port | `OrderPrintingConsumer.test.ts` | Implemented |
| Idempotent consumers | §15 | ADR-ARCH-014 | `order_domain_consumer_processed` | Registry idempotency test | Implemented |
| Failure isolation | §15 | ADR-ARCH-014 | Registry parallel dispatch | Registry test | Implemented |
| Consumer telemetry | §8 | ADR-ARCH-014 | `OpsEventConsumerMetrics` | Ops taxonomy | Implemented |
| Router cleanup | §13 | ADR-ARCH-005 | `server/routers.ts` | `order-router-cleanup.test.ts`, **FF-05** | Verified |
| Relay post-command | §15 | ADR-ARCH-008 | `runOrderCommand` → relay | Integration | Implemented |
| ADR-ARCH-014 | §8, §15 | ADR-ARCH-014 | `ADR-ARCH-014.md` | Exit review | Ratified |
| Consumer Independence Matrix | Amendment | — | `Consumer-Independence-Matrix.md` | Exit gate | Verified |
| Consumer Ordering Matrix | Amendment | — | `Consumer-Ordering-Matrix.md` | Exit gate | Verified |

---

**Exit report:** [Architecture-Exit-Report.md](./Architecture-Exit-Report.md)
