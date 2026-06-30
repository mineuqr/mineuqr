# PRINT-CONNECTOR-DISCOVERY-1 — Architecture Traceability

---

## ADR-ARCH-016 rules satisfied

| Rule | Compliance |
|------|------------|
| RLC owns native discovery | Discovery commands execute on restaurant host |
| Gateway routes only | `routeDiscoverPrinters` delegates to execution port |
| Session transports only | `discover_printers` command envelope |
| Cloud does not discover printers | Embedded cloud `discoverPrinters` router removed |
| Single production path | Workspace + gateway + session + RLC |

---

## Related programs

- PRINT-GATEWAY-1 — gateway routing foundation
- PRINT-CONNECTOR-NETWORK-1 — session command transport
- PRINT-CONNECTOR-LOCAL-1 — RLC command handler
- PRINT-UX-2A — operator provisioning UX
