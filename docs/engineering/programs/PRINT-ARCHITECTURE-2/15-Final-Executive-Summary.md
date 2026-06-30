# PRINT-ARCHITECTURE-2 — Final Executive Summary

**Date:** 2026-06-30  
**Program:** PRINT-ARCHITECTURE-2 — Distributed Printing Topology  
**Authority:** ADR-ARCH-016 v1.1 (amended by PRINT-CONNECTOR-NETWORK-1)  
**Type:** Architecture only — no code changes

---

## Architectural Decisions

1. **Restaurant Local Connector (RLC)** is the production execution host for all OS print I/O.
2. **Cloud** retains Printing Service job authority and Printer Management catalog SSOT.
3. **Browser → Cloud → Gateway → RLC** — no direct browser-to-connector path.
4. **RLC outbound session** to cloud for NAT-friendly connectivity — **mandatory for all deployments** (ADR-ARCH-016 v1.1).
5. **Cloud never initiates inbound or outbound dial** to restaurant infrastructure for connector communication.
6. **`PrintConnectorPort` interface unchanged** — cloud uses remote adapter; RLC uses in-process `PrintConnectorApi`.
7. **`embedded` connector is non-production** for distributed restaurants.
8. **No simulated fallback** when RLC offline — canonical failures and empty discovery.
9. **Connector Session is SSOT** for connectivity, heartbeat, and availability (ADR Rule 10).

Full decision table: `12-Decision-Matrix.md`  
Formal ADR: [`docs/architecture/adrs/ADR-ARCH-016.md`](../../../architecture/adrs/ADR-ARCH-016.md) (ADR-ARCH-016 v1.1)

---

## Trade-off Analysis

| Trade-off | Choice | Rationale |
|-----------|--------|-----------|
| Simplicity vs distribution | Distributed RLC | Cloud cannot access USB/LAN printers — non-negotiable |
| Browser direct vs cloud relay | Cloud relay | Security, multi-device, single auth |
| Inbound vs outbound connection | **Outbound from RLC only** | ADR-ARCH-016 v1.1 — immutable direction |
| Queue vs synchronous session | Session + job queue in cloud | Printing Service already persists jobs |
| One vs many RLC per site | One active (optional standby) | Minimal ops complexity |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| RLC not installed at restaurant | High | Pairing UX, onboarding checklist, workspace offline banner |
| RLC PC reboot / sleep | Medium | Auto-start service, heartbeat alerts |
| Internet outage at restaurant | Medium | Job queue + replay on reconnect (P1–P3) |
| Credential compromise | Medium | Revocation, rotation, scoped permissions |
| Implementation scope creep | Medium | Strict program sequencing (P1–P6) |
| Operator expects cloud-only setup | High | Documentation + Management connector status |

---

## Approved Topology

```
Browsers (any OS) ──HTTPS──► MineuQR Cloud
                              ├── Printing Service (jobs)
                              ├── Printer Management (catalog)
                              └── Connector Gateway (orchestration only)
                                      ▲
                           Connector Session (RLC-initiated outbound)
                                      │
                              Restaurant Local Connector (infrastructure only)
                                      │
                              Platform → Transport → OS → Printer
```

---

## Recommended Implementation Sequence

1. **PRINT-GATEWAY-1** — Gateway service + remote `PrintConnectorPort` adapter — **Complete**  
2. **PRINT-CONNECTOR-NETWORK-1** — Session protocol and outbound transport — **Complete**  
3. **PRINT-CONNECTOR-LOCAL-1** — Windows `local_desktop` agent installer  
4. **PRINT-UX-2** — Connector online/offline in Workspace and Management  
5. **PRINT-PRODUCTION-VALIDATION-2** — Distributed end-to-end certification  

---

## Exit Criteria

| Criterion | Met |
|-----------|-----|
| Distributed Printing Topology fully defined | ✅ |
| Deployment models approved | ✅ |
| Communication topology approved | ✅ |
| Authentication model approved | ✅ |
| Failure model approved | ✅ |
| Offline model approved | ✅ |
| Sequence diagrams complete | ✅ |
| ADR approved | ✅ |
| Architecture traceability complete | ✅ |
| Implementation roadmap produced | ✅ |

---

**DISTRIBUTED PRINTING ARCHITECTURE APPROVED**
