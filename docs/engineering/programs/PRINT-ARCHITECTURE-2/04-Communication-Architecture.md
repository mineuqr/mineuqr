# PRINT-ARCHITECTURE-2 — Communication Architecture

**Date:** 2026-06-30  
**Authority:** ADR-ARCH-016 v1.2

---

## AD-4: How does the browser communicate with Print Connector?

**Decision: Indirect only — Browser → Cloud → Connector Gateway → RLC.**

The browser **never** opens a socket, localhost port, or native bridge to the Print Connector. All operator actions use existing cloud tRPC (`printConnector.*`, `printerManagement.*`).

| Action | Path |
|--------|------|
| Discover printers | Browser → Cloud → Gateway → RLC → OS → results return via same chain |
| Provision printer | Browser → Cloud (persist catalog) — discovery snapshot from RLC |
| Test print | Browser → Cloud → Printing path or management test → Gateway → RLC |
| Order print | Order event → Printing Service → `PrintConnectorPort` → Gateway → RLC |

**Rationale:** Security (no LAN exposure), CORS elimination, single auth model, multi-browser consistency.

---

## AD-5: How does the Cloud communicate with Print Connector?

**Decision: Agent-initiated Connector Session from RLC to Cloud (mandatory).**

| Property | Value |
|----------|-------|
| Initiator | **RLC only** (outbound) — works behind NAT |
| Direction | Duplex over persistent session; **cloud never dials restaurant** |
| Scope | One session per `restaurantId` + `connectorInstanceId` |
| Concrete protocol | Implemented — PRINT-CONNECTOR-NETWORK-1 (`server/connector-session/`) |
| Transport direction | Immutable — wire protocol may change; direction may not (ADR Rule 4) |

Logical message families (contract-level, not wire format):

- `RegisterConnector` / `Heartbeat`
- `DiscoverPrinters` (command) / `DiscoverPrintersResult`
- `ExecutePrint` (command) / `PrintExecutionResult`
- `GetPrinterStatus` / `GetPrinterCapabilities`
- `ConnectorOffline` (event)

Cloud **never** initiates inbound connections to restaurant LAN. **MineuQR Cloud never opens outbound connections toward restaurant infrastructure** for connector communication (ADR-ARCH-016 v1.2 Rules 1–2).

---

## AD-6: Can multiple browsers use the same connector simultaneously?

**Decision: Yes.**

- All browsers talk to the same cloud APIs.
- Cloud routes to the **registered active RLC** for that restaurant.
- RLC serializes per-printer execution (see concurrent handling).
- Browser count does not multiply connector instances.

---

## AD-7: How are concurrent print requests handled?

| Layer | Behavior |
|-------|----------|
| **Printing Service (cloud)** | Authoritative job queue per restaurant; idempotent dispatch |
| **Connector Gateway** | Routes jobs to RLC; tracks in-flight execution IDs |
| **RLC** | Per-printer execution queue (serial); parallel across different printers (future multi-printer) |
| **Conflict** | Cloud job state wins; duplicate dispatch deduplicated by `printJobId` |

---

## Communication Prohibitions

- Browser → RLC direct (ADR Rule 9)
- Cloud → restaurant LAN inbound connection (ADR Rule 2)
- Cloud → restaurant infrastructure outbound dial for connector (ADR Rule 2)
- RLC accepting business commands from browsers or external clients (ADR Rule 9)
- Duplicated business logic on RLC (ADR Rule 8 — orchestration stays cloud)

---

## Non-Goals (This Program)

No HTTP routes, WebSocket handlers, polling loops, or message queue implementation — architecture defines **topology and contracts** only.
