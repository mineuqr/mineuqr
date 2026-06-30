# PRINT-ARCHITECTURE-2 — Sequence Diagrams

**Date:** 2026-06-30

---

## SD-1 — Printer Discovery (Distributed)

```mermaid
sequenceDiagram
    participant B as Browser
    participant C as Cloud API
    participant G as Connector Gateway
    participant R as Restaurant Local Connector
    participant OS as Host OS Spooler

    B->>C: printConnector.discoverPrinters(restaurantId)
    C->>G: DiscoverPrinters(restaurantId)
    G->>R: DiscoverPrinters command
    R->>OS: PlatformAdapter.discoverPrinters()
    OS-->>R: Printer list
    R-->>G: DiscoverPrintersResult
    G-->>C: PrinterInfo[]
    C-->>B: Printer list (no simulated fallback)
```

---

## SD-2 — Provision Printer

```mermaid
sequenceDiagram
    participant B as Browser
    participant C as Cloud API
    participant PM as Printer Management
    participant DB as restaurant_printers
    participant G as Connector Gateway
    participant R as Restaurant Local Connector

    B->>C: provisionPrinter(printerId, ...)
    C->>G: GetPrinterCapabilities(printerId)
    G->>R: GetPrinterCapabilities
    R-->>G: capabilities
    G-->>C: capabilities
    C->>PM: save catalog row
    PM->>DB: INSERT/UPDATE
    PM->>G: SyncSelection (optional)
    G->>R: SelectPrinter (local runtime sync)
    C-->>B: success
```

---

## SD-3 — Order Print (Production Path)

```mermaid
sequenceDiagram
    participant O as Order Domain
    participant PS as Printing Service
    participant PCP as PrintConnectorPort
    participant G as Connector Gateway
    participant R as Restaurant Local Connector
    participant P as Physical Printer

    O->>PS: OrderCreated event
    PS->>PS: createJob, dispatch
    PS->>PCP: submit(job)
    PCP->>G: ExecutePrint(payload, printerId)
    G->>R: ExecutePrint command
    R->>P: OS print
    P-->>R: result
    R-->>G: PrintExecutionResult
    G-->>PS: PrintExecutionResult
    PS->>PS: update job state
```

---

## SD-4 — Connector Pairing

```mermaid
sequenceDiagram
    participant A as Admin Browser
    participant C as Cloud API
    participant R as Restaurant Local Connector

    A->>C: generatePairingCode(restaurantId)
    C-->>A: one-time code + QR
    R->>C: RegisterConnector(code, instanceId, target)
    C->>C: validate code, issue credential
    C-->>R: connector credential + restaurantId
    R->>C: Heartbeat (ongoing)
```

---

## SD-5 — RLC Offline / Job Queue

```mermaid
sequenceDiagram
    participant PS as Printing Service
    participant G as Connector Gateway
    participant R as Restaurant Local Connector

    PS->>G: ExecutePrint
    G--xR: (session down)
    G-->>PS: connector_offline failure
    Note over PS: Job remains dispatched/awaiting

    R->>G: Reconnect + Heartbeat
    G->>R: DrainPendingJobs(restaurantId)
    R-->>G: PrintExecutionResult(s)
    G-->>PS: Results
```

---

## SD-6 — Multi-Browser Concurrent Access

```mermaid
sequenceDiagram
    participant B1 as Browser A
    participant B2 as Browser B
    participant C as Cloud API
    participant G as Connector Gateway
    participant R as Restaurant Local Connector

    B1->>C: discoverPrinters
    B2->>C: printOrder
    C->>G: DiscoverPrinters
    C->>G: ExecutePrint
    G->>R: serialize per printer queue
    R-->>G: results
    G-->>C: responses
    C-->>B1: printer list
    C-->>B2: print acknowledged
```
