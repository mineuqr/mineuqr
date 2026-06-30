# PRINT-ARCHITECTURE-2 — Connector Placement

**Date:** 2026-06-30

---

## AD-1: Where does Print Connector live?

**Decision:** The Print Connector **executes on a restaurant-authorized host** within restaurant premises (RLC). The **cloud holds orchestration and contracts only** — not OS print I/O for production.

| Concern | Location |
|---------|----------|
| `PrintConnectorApi` implementation (discover, print, status) | **RLC process** |
| `PrintConnectorPort` adapter (Printing Service integration) | **Cloud** — delegates to gateway → RLC |
| Platform / transport adapters | **RLC only** |
| Printer catalog (`restaurant_printers`) | **Cloud** (SSOT for configured printers) |
| Print job lifecycle | **Cloud** (SSOT) |

---

## Placement Rules

1. **One logical connector domain per restaurant site** (may have hot-standby second instance — see Decision Matrix).
2. RLC must share a network path to printers (USB directly attached, or LAN-visible queue).
3. RLC must establish and maintain **outbound** Connector Session to cloud (NAT-friendly). **Cloud never initiates connections to restaurant infrastructure** (ADR-ARCH-016 v1.1 Rule 1–2).
4. Cloud API process **must not** be required to access restaurant LAN printers.

---

## Relationship to Existing `DeploymentRuntime`

| `DeploymentTarget` | Placement | Production use |
|--------------------|-----------|----------------|
| `embedded` | API process | Non-production for distributed SaaS |
| `local_desktop` | Restaurant PC | **Primary** |
| `android` | On-premise tablet | Future |
| `edge` | On-premise appliance | Optional |
| `future` | Reserved | — |

`DeploymentRuntime` remains the abstraction that binds platform adapters to a host. Only the **host** changes — not business code.

---

## What Stays in Cloud

- `PrintingService`, dispatch, job persistence
- `PrinterManagementService` (provisioning orchestration — cloud-side)
- Workspace / Management UI
- Connector Gateway (presence, routing, auth verification)

---

## Evidence (Current Limitation)

PRINT-CONNECTOR-WINDOWS-1 investigation: `discoverPrinters()` uses `process.platform` on API host. Browser `/api/trpc` never reaches operator workstation OS.
