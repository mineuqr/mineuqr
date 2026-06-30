# PRINT-ARCHITECTURE-2 — Decision Matrix

**Date:** 2026-06-30

---

## Architecture Questions — Formal Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Where does Print Connector live? | **Restaurant Local Connector (RLC)** on premises; cloud orchestrates only |
| 2 | Who owns printer discovery? | **RLC executes**; cloud presents and provisions catalog |
| 3 | Who owns printer selection? | **Cloud catalog SSOT**; RLC validates at execution |
| 4 | Browser → Connector? | **Indirect** — Browser → Cloud → Gateway → RLC |
| 5 | Cloud → Connector? | **RLC-initiated outbound Connector Session** (mandatory — ADR-ARCH-016 v1.1) |
| 6 | Multiple browsers same connector? | **Yes** — shared cloud routing to one RLC per site |
| 7 | Concurrent print requests? | **Cloud queues**; RLC serializes per printer |
| 8 | Authentication / trust? | **Session + pairing + scoped connector credential** |
| 9 | Restaurant isolation? | **Tenant-bound credentials and routing** |
| 10 | Offline behavior? | **Cloud authoritative**; jobs queue; RLC replays |
| 11 | Availability detection? | **Heartbeat + session state** |
| 12 | Failure reporting? | **Canonical PrintExecutionResult** + ops events |
| 13 | Deployment independence? | **DeploymentRuntime + port adapter swap** |
| 14 | Same PrintConnectorPort everywhere? | **Remote adapter in cloud** delegates to gateway; RLC runs `PrintConnectorApi` |

---

## Alternatives Considered

| Alternative | Verdict | Reason |
|-------------|---------|--------|
| Browser WebUSB / direct OS access | **Rejected** | Security, platform fragmentation, no server path |
| Cloud VPN into restaurant LAN | **Rejected** | Operational complexity, security surface |
| Cloud-initiated inbound to restaurant | **Rejected** | NAT/firewall; ADR-ARCH-016 Rule 2 |
| Cloud-initiated outbound dial to restaurant | **Rejected** | ADR-ARCH-016 v1.1 — RLC owns session establishment |
| Browser → localhost connector | **Rejected** | CORS, trust, multi-device inconsistency |
| Embedded cloud connector for production | **Rejected** | Proven: cannot see local printers |
| Per-browser connector install | **Rejected** | Ops burden; use one RLC per site |
| Message queue (Kafka/SQS) between cloud and RLC | **Deferred** | Session + drain sufficient for v1; revisit at scale |

---

## Hot-Standby Connector

| Option | Decision |
|--------|----------|
| Active-passive second RLC | **Approved optional** — same `restaurantId`, gateway elects leader |
| Active-active same printer | **Rejected v1** — spooler conflicts |

---

## Quality Attribute Scorecard

| Attribute | Rating | Notes |
|-----------|--------|-------|
| Scalability | High | Cloud stateless; horizontal API |
| Deployment independence | High | Existing `DeploymentRuntime` model |
| Platform independence | High | Adapters unchanged on RLC |
| Restaurant isolation | High | Credential + routing |
| Fault tolerance | Medium-High | Queued jobs; depends on RLC outbox in impl |
| Operational complexity | Medium | One agent per site — acceptable |
| No duplicated business logic | High | Single Printing Service path |
| One production path | High | Gateway → RLC |
