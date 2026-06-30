# PRINT-ARCHITECTURE-2 — Communication Architecture

**Date:** 2026-06-30

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

**Decision: Agent-initiated Connector Session from RLC to Cloud.**

| Property | Value |
|----------|-------|
| Initiator | RLC (outbound) — works behind NAT |
| Direction | Duplex over persistent session |
| Scope | One session per `restaurantId` + `connectorInstanceId` |
| Concrete protocol | **Deferred** to `PRINT-CONNECTOR-NETWORK-1` (not in this program) |

Logical message families (contract-level, not wire format):

- `RegisterConnector` / `Heartbeat`
- `DiscoverPrinters` (command) / `DiscoverPrintersResult`
- `ExecutePrint` (command) / `PrintExecutionResult`
- `GetPrinterStatus` / `GetPrinterCapabilities`
- `ConnectorOffline` (event)

Cloud **never** initiates inbound connections to restaurant LAN.

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

- Browser → RLC direct
- Cloud → restaurant LAN inbound connection
- Duplicated business logic on RLC (orchestration stays cloud)

---

## Non-Goals (This Program)

No HTTP routes, WebSocket handlers, polling loops, or message queue implementation — architecture defines **topology and contracts** only.
