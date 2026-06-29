# Consumer Ordering Matrix — ORDER-EVENTS-1B

**Authority:** Architecture Authority  
**Program:** ORDER-EVENTS-1B — Event Consumers  
**Status:** Pending exit verification  
**Amendment:** [Architecture-Amendment.md](./Architecture-Amendment.md)

Complete this matrix **before program closure**. Ordering must be owned exclusively by the Registration Layer.

---

## Layer verification

| Layer | Ordering present | Allowed | Result | Evidence |
|---|---|---|---|---|
| **Publisher** (`InProcessEventPublisher`) | Must be **No** | Transport + hand-off to Registration Layer only | — | _Code review at exit_ |
| **Registration Layer** (`OrderEventConsumerRegistry`) | May be **Yes** (declarative) | Sole owner of execution policy | — | _Registry implementation at exit_ |
| **Consumers** (all four) | Must be **No** | Handle single event only | — | _Code review at exit_ |

---

## Per-consumer registration record

| Consumer | Registration order | Execution policy | Dependency count | Ordering owner | Result |
|---|---|---|---|---|---|
| `OrderNotificationConsumer` | — | — | **0** (required) | Registration Layer | **Pending** |
| `OrderSessionConsumer` | — | — | **0** (required) | Registration Layer | **Pending** |
| `OrderKitchenConsumer` | — | — | **0** (required) | Registration Layer | **Pending** |
| `OrderPrintingConsumer` | — | — | **0** (required) | Registration Layer | **Pending** |

### Execution policy values (declarative)

| Policy | Meaning |
|---|---|
| `parallel` | Dispatch with other consumers in same group; no ordering relative to peers |
| `sequential` | Registration Layer enforces order within declared group only |
| `isolated` | Consumer runs in failure-isolated unit (default) |

**Note:** Default policy for ORDER-EVENTS-1B is **`parallel` + `isolated`** unless Architecture Authority approves sequential groups. No consumer may depend on another consumer completing first.

---

## Prohibition checklist (P1–P4)

| # | Prohibition | Pass | Evidence |
|---|---|---|---|
| P1 | No ordering inside Publisher | — | |
| P2 | No ordering inside Consumers | — | |
| P3 | No Consumer-to-Consumer execution chains | — | |
| P4 | No hardcoded sequencing outside Registration Layer | — | |

---

## Event dispatch flow (expected)

```
OrderEventRelay
    → Publisher.publish(envelope)
        → RegistrationLayer.dispatch(envelope)
            → [parallel/isolated]
                → OrderNotificationConsumer.handle (if subscribed)
                → OrderSessionConsumer.handle (if subscribed)
                → OrderKitchenConsumer.handle (if subscribed)
                → OrderPrintingConsumer.handle (if subscribed)
```

| Check | Result | Evidence |
|---|---|---|
| Publisher delegates to Registration Layer | — | |
| Registration order is declarative (config/data) | — | |
| No hardcoded consumer list in Publisher | — | |
| Consumer dependency graph acyclic | — | |

---

**Certification gate:** P1–P4 **Pass**; every consumer **Dependency count = 0**; **Ordering owner** = Registration Layer for all rows.
