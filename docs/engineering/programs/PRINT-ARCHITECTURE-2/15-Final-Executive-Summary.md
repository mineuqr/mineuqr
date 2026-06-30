# PRINT-ARCHITECTURE-2 — Final Executive Summary

**Date:** 2026-06-30  
**Program:** PRINT-ARCHITECTURE-2 — Distributed Printing Topology  
**Authority:** ADR-ARCH-016 v1.2 (consolidated by PRINT-GATEWAY-1 through PRINT-CONNECTOR-WINDOWS-1)  
**Type:** Architecture only — no code changes

---

## Architectural Decisions

1. **Restaurant Local Connector (RLC)** is the production execution host for all OS print I/O.
2. **Cloud** retains Printing Service job authority and Printer Management catalog SSOT.
3. **Browser → Cloud → Gateway → RLC** — no direct browser-to-connector path (Rule 8).
4. **RLC outbound session** to cloud — mandatory for all deployments (Rules 1–2).
5. **One canonical execution path** — Printing Service through Platform Adapter to printer (Rule 18).
6. **`PrintConnectorPort` interface unchanged** — deployment-independent (Rule 11).
7. **`embedded` connector is non-production** for distributed restaurants.
8. **No simulated fallback in production** — Rule 21; discovery failures reported explicitly.
9. **Connector Session is SSOT** for connectivity (Rule 9).
10. **PlatformAdapterHost + LocalConnectorRuntimeFacade** — Rules 19–20 (validated by PRINT-CONNECTOR-WINDOWS-1).

Full decision table: `12-Decision-Matrix.md`  
Formal ADR: [`docs/architecture/adrs/ADR-ARCH-016.md`](../../../architecture/adrs/ADR-ARCH-016.md) (ADR-ARCH-016 v1.2 — 21 mandatory rules)

---

## Trade-off Analysis

| Trade-off | Choice | Rationale |
|-----------|--------|-----------|
| Embedded vs distributed | **Distributed RLC** | Cloud cannot see restaurant printers |
| Inbound vs outbound connection | **Outbound from RLC only** | ADR-ARCH-016 v1.2 Rules 1–4 — immutable direction |
| Gateway prints vs routes | **Routes only** | Rule 5 — orchestration infrastructure |
| Business logic in RLC | **Rejected** | Rules 6–7 — infrastructure only |

---

## Implementation Status (post v1.2)

| Phase | Program | Status |
|-------|---------|--------|
| P0 | PRINT-ARCHITECTURE-2 | Complete |
| P1 | PRINT-GATEWAY-1 | Complete |
| P2 | PRINT-CONNECTOR-NETWORK-1 | Complete |
| P3 | PRINT-CONNECTOR-LOCAL-1 | Complete |
| P3b | PRINT-CONNECTOR-WINDOWS-1 | Complete |
| P4 | PRINT-UX-2 | Planned |
| P5 | PRINT-PRODUCTION-VALIDATION-2 | Planned |

---

## Governance

ADR-ARCH-016 v1.2 is the **single authoritative reference** for the Distributed Printing Platform.

**Architecture Evolution Policy:** Future programs must implement this architecture, not redesign it. Changes to connector/gateway responsibilities, session authority, runtime boundaries, canonical execution path, or deployment topology require a new ADR or formal amendment. Feature implementation evolves the architecture — it never replaces it.
