# Consumer Independence Matrix — ORDER-EVENTS-1B

**Authority:** Architecture Authority  
**Program:** ORDER-EVENTS-1B — Event Consumers  
**Status:** Pending exit verification  
**Amendment:** [Architecture-Amendment.md](./Architecture-Amendment.md)

Complete this matrix **before program closure**. Every row must pass for certification.

---

## Registered consumers

| Consumer | Responsibility | Source artifact |
|---|---|---|
| `OrderNotificationConsumer` | Owner notifications, ready push, push subscription cleanup | `server/order/infrastructure/events/consumers/` (planned) |
| `OrderSessionConsumer` | Session events, session aggregate inc/dec | `server/order/infrastructure/events/consumers/` (planned) |
| `OrderKitchenConsumer` | Kitchen integration hooks (no UI) | `server/order/infrastructure/events/consumers/` (planned) |
| `OrderPrintingConsumer` | Print-request dispatch intent (no connector) | `server/order/infrastructure/events/consumers/` (planned) |

---

## Rule verification (R1–R7)

For each Consumer, verify every rule. **Pass** required for certification.

### `OrderNotificationConsumer`

| Rule | Description | Pass | Evidence |
|---|---|---|---|
| R1 | No import of another Consumer | — | _Import graph / static analysis at exit_ |
| R2 | No invocation of another Consumer | — | _Code review + tests at exit_ |
| R3 | No dependency on another Consumer's results | — | _Handler signature / flow review at exit_ |
| R4 | No shared mutable state with other Consumers | — | _State audit at exit_ |
| R5 | Failure does not block other Consumers | — | _Failure isolation test at exit_ |
| R6 | Independently enable/disable | — | _Registration config at exit_ |
| R7 | Owns notification responsibility only | — | _Scope review at exit_ |

### `OrderSessionConsumer`

| Rule | Description | Pass | Evidence |
|---|---|---|---|
| R1 | No import of another Consumer | — | |
| R2 | No invocation of another Consumer | — | |
| R3 | No dependency on another Consumer's results | — | |
| R4 | No shared mutable state with other Consumers | — | |
| R5 | Failure does not block other Consumers | — | |
| R6 | Independently enable/disable | — | |
| R7 | Owns session integration responsibility only | — | |

### `OrderKitchenConsumer`

| Rule | Description | Pass | Evidence |
|---|---|---|---|
| R1 | No import of another Consumer | — | |
| R2 | No invocation of another Consumer | — | |
| R3 | No dependency on another Consumer's results | — | |
| R4 | No shared mutable state with other Consumers | — | |
| R5 | Failure does not block other Consumers | — | |
| R6 | Independently enable/disable | — | |
| R7 | Owns kitchen hook responsibility only | — | |

### `OrderPrintingConsumer`

| Rule | Description | Pass | Evidence |
|---|---|---|---|
| R1 | No import of another Consumer | — | |
| R2 | No invocation of another Consumer | — | |
| R3 | No dependency on another Consumer's results | — | |
| R4 | No shared mutable state with other Consumers | — | |
| R5 | Failure does not block other Consumers | — | |
| R6 | Independently enable/disable | — | |
| R7 | Owns printing dispatch responsibility only | — | |

---

## Summary attributes

| Consumer | Independent | Idempotent | Failure isolated | No consumer dependency | No shared state | **Overall** |
|---|---|---|---|---|---|---|
| `OrderNotificationConsumer` | — | — | — | — | — | **Pending** |
| `OrderSessionConsumer` | — | — | — | — | — | **Pending** |
| `OrderKitchenConsumer` | — | — | — | — | — | **Pending** |
| `OrderPrintingConsumer` | — | — | — | — | — | **Pending** |

---

## Dependency graph

```
Expected at certification: acyclic — zero edges between Consumers

OrderNotificationConsumer  (no deps)
OrderSessionConsumer       (no deps)
OrderKitchenConsumer       (no deps)
OrderPrintingConsumer      (no deps)
```

| Check | Result | Evidence |
|---|---|---|
| Consumer dependency graph is acyclic | — | _Diagram + import analysis at exit_ |
| No Consumer → Consumer edges | — | |

---

**Certification gate:** All rules R1–R7 **Pass** for every Consumer; summary **Overall** = Pass.
