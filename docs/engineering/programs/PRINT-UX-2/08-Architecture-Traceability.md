# PRINT-UX-2 — Architecture Traceability

**Authority:** [ADR-ARCH-016 v1.2](../../../architecture/adrs/ADR-ARCH-016.md)

---

## ADR Compliance

| ADR Rule | PRINT-UX-2 |
|----------|------------|
| Rules 1–2 Connection direction | UI shows RLC-initiated session, not browser-direct |
| Rule 5 Gateway never prints | No gateway UI changes |
| Rule 8 No direct client→RLC | Workspace uses cloud tRPC only |
| Rule 9 Session SSOT | Session card reflects directory state |
| Rule 18 Canonical path | Workspace reflects distributed topology |
| Rule 21 No production simulation | No simulated printer in workspace |

---

## Unchanged Modules

- `PrintingService.ts`
- `PrintConnectorPort.ts`
- `server/connector-gateway/services/*`
- `server/connector-session/services/*`
- `server/connector-local/*`

---

## New / Modified (Presentation Only)

| Path | Role |
|------|------|
| `PrintWorkspacePresenceReadService.ts` | Read projection |
| `printWorkspacePresenceComposition.ts` | Wires directory + printer read |
| `printWorkspaceRouter.ts` | New read procedures |
| `client/.../print-workspace/*` | Four-section UI |

---

## Depends On

PRINT-GATEWAY-1 (ConnectorDirectory), PRINT-CONNECTOR-NETWORK-1, PRINT-CONNECTOR-LOCAL-1, PRINT-UX-1
