# ORDER-EVENTS-1B — Architecture Amendment

**Authority:** Architecture Authority  
**Effective:** 2026-06-27  
**Program:** ORDER-EVENTS-1B — Event Consumers  
**Status:** Mandatory — part of official Exit Criteria  

This amendment supplements the [Program Charter](./Program-Charter.md). It becomes a **permanent Architecture Compliance requirement** for every future Event Consumer introduced into MineuQR.

---

## 1. Consumer Independence Verification

Every Event Consumer **shall be independently executable**.

### Mandatory rules

| # | Rule |
|---|---|
| R1 | No Consumer imports another Consumer |
| R2 | No Consumer invokes another Consumer |
| R3 | No Consumer depends on execution results of another Consumer |
| R4 | No shared mutable state exists between Consumers |
| R5 | Failure of one Consumer does not prevent execution of other Consumers |
| R6 | Every Consumer can be enabled or disabled independently |
| R7 | Every Consumer owns its own responsibility only |

### Implementation constraints

- Consumers subscribe to **domain events** via the Registration Layer only.
- Cross-cutting concerns (idempotency, telemetry) use **infrastructure services** — not other Consumers.
- Consumer enable/disable is controlled by **registration configuration**, not compile-time coupling.

### Exit deliverable

[Consumer-Independence-Matrix.md](./Consumer-Independence-Matrix.md) — completed with implementation evidence before certification.

---

## 2. Consumer Ordering Verification

If execution ordering exists, it must be managed **exclusively by the Consumer Registration Layer**.

### Prohibited

| # | Prohibition |
|---|---|
| P1 | Ordering inside Publisher |
| P2 | Ordering inside Consumers |
| P3 | Consumer-to-Consumer execution chains |
| P4 | Hardcoded execution sequencing outside Registration Layer |

### Required

| # | Requirement |
|---|---|
| Q1 | Ordering policy must be **declarative** (registration metadata) |
| Q2 | Publisher remains **transport infrastructure only** |
| Q3 | Consumers remain **independent** |
| Q4 | Registration Layer owns execution ordering |

### Registration Layer responsibilities

- Declare which event types each consumer handles.
- Declare registration order and execution policy (e.g. parallel vs sequential group).
- Dispatch to consumers with failure isolation.
- Maintain an **acyclic** consumer dependency graph (dependency count = 0 between consumers).

### Exit deliverable

[Consumer-Ordering-Matrix.md](./Consumer-Ordering-Matrix.md) — completed with implementation evidence before certification.

---

## 3. Architecture role boundaries

```
Outbox → Relay → Publisher (transport only)
                      ↓
            Registration Layer (ordering + dispatch + isolation)
                      ↓
         ┌────────────┼────────────┐
         ↓            ↓            ↓
   Notification   Session      Kitchen / Printing
   Consumer       Consumer     Consumers
```

| Layer | May | Must not |
|---|---|---|
| **Publisher** | Deliver envelope to Registration Layer; record publication metrics | Order consumers; invoke consumers directly; contain business logic |
| **Registration Layer** | Register consumers; declarative ordering; failure isolation; enable/disable | Import consumer business logic; mutate Order aggregate |
| **Consumer** | Handle assigned event types; own integration side-effects | Import/call other Consumers; define global execution order |

---

## 4. Failure criteria (certification blockers)

ORDER-EVENTS-1B **cannot be certified** if:

- Any Consumer directly calls another Consumer
- Publisher contains execution ordering
- Consumers contain execution ordering
- Shared mutable state exists between Consumers
- Consumer dependency graph is not acyclic

---

## 5. Success criteria

Architecture Authority will certify ORDER-EVENTS-1B only if:

1. **Consumer Independence Verification** passes completely for every Consumer
2. **Consumer Ordering Verification** passes completely for the Registration Layer

Both matrices must be completed in the Architecture Exit Report.

---

## 6. Permanent compliance

After ORDER-EVENTS-1B certification, every new Event Consumer must:

1. Be listed in the Consumer Independence Matrix at program exit (or amendment review)
2. Register exclusively through the Registration Layer
3. Satisfy rules R1–R7 and prohibitions P1–P4

Violations are Architecture Compliance failures per Constitution §28.

---

**Related:** [Program Charter](./Program-Charter.md) · [Architecture Traceability Matrix](./Architecture-Traceability-Matrix.md)
