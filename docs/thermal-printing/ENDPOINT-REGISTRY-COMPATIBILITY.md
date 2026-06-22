# Endpoint Registry Compatibility Strategy

**Task:** THERMAL-PRINTING-12E.2A  
**Status:** Planning only — no production migration in this phase  
**Follow-up:** THERMAL-PRINTING-12E.2B (registry migration and runtime integration)

## Context

MineuQR printing has been validated end-to-end through the **Windows Agent** path:

- Routing → Resolution → Assignment → Dispatch → Agent registration → Delivery confirmation → Physical printing

The platform is introducing a **Multi-Endpoint Printing Architecture** with a platform-neutral `EndpointRecord` abstraction. Phase 12E.2A adds domain types and a registry **contract** only. All existing print flows continue to use legacy stores.

## Principle: additive, not disruptive

| Legacy module | Role today | Migration stance |
|---------------|------------|------------------|
| `agentRegistry` | Authoritative agent registration and heartbeats | Remains authoritative until 12E.2B dual-write |
| `printerProfileStore` | Latest-known printer inventory per agent | Remains authoritative for resolution reads |
| `endpointRegistry` | New domain model (12E.2A) | Not consulted by routing, assignment, dispatch, or execution |

**Do not remove or replace** Agent Runtime services in 12E.2A.

## Identity mapping

Runtime agents map 1:1 to endpoints during early migration:

```
agentId  ──►  endpointId   (same string, trimmed)
```

New endpoint types that are not OS runtimes receive their own ids:

| Endpoint type | Typical id source |
|---------------|-------------------|
| `WINDOWS_AGENT` | Existing `agentId` |
| `ANDROID_RUNTIME` | Existing `agentId` |
| `IOS_RUNTIME` | Existing `agentId` |
| `LAN_PRINTER` | Stable LAN device id (host, MAC, or DB printer id) |
| `VENDOR_CONNECTOR` | Vendor connector installation id |

## Platform → endpoint type

| `AgentPlatform` (legacy) | `EndpointType` (new) |
|--------------------------|----------------------|
| `windows` | `WINDOWS_AGENT` |
| `android` | `ANDROID_RUNTIME` |
| `ios` | `IOS_RUNTIME` |

## Connectivity mapping

Legacy agent status uses lowercase (`online`, `offline`, `stale`). Endpoint connectivity uses uppercase (`ONLINE`, `OFFLINE`, `STALE`, `UNKNOWN`).

| Agent status | Endpoint connectivity |
|--------------|----------------------|
| `offline` (unregistered) | `OFFLINE` |
| `online` | `ONLINE` |
| `stale` | `STALE` |
| missing heartbeat | `UNKNOWN` |

Projection helpers live in `server/printing/endpointRegistryCompatibility.ts`.

## Capability mapping

`platformCapabilityStore` reports are translated into `EndpointCapabilities`:

- **Transports:** `usb`, `bluetooth`, `network` booleans carry over directly.
- **AirPrint:** derived when platform is `ios` and network transport is enabled (not a Windows assumption).
- **Vendor connector:** `false` for runtime agents until vendor connectors register independently.
- **Execution:** `localPrinting` carries over; `methods` are derived from enabled transports and platform (e.g. `spooler` when USB is available on Windows agents).

Printer-specific capability (paper width, ESC/POS features) stays in `PrinterProfile` / `printerProfileStore` — it is **not** folded into endpoint capabilities.

## Printer inventory

`printerProfileStore` records (`AgentPrinterInventoryRecord`) remain the source of truth for profile negotiation and resolution.

During observability unification (12E.2B+), inventory may be **referenced** from endpoint metadata (counts, timestamps, fingerprints) without duplicating full `PrinterProfile[]` on every heartbeat.

## Proposed 12E.2B migration sequence

1. **Dual-write on agent registration** — `registerAgent` also calls `endpointRegistry.registerEndpoint` via a compatibility adapter.
2. **Dual-write on heartbeat** — `updateAgentHeartbeat` mirrors `updateEndpointHeartbeat`.
3. **Dual-write on capability report** — platform capability reports update `updateEndpointCapabilities`.
4. **Dual-write on printer inventory** — attach inventory metadata; keep `printerProfileStore` authoritative for reads.
5. **Read-model cutover** — dashboards and ops APIs read `endpointRegistry`; print pipeline still uses legacy paths until routing/assignment are endpoint-aware (later tasks).
6. **Decommission** — retire `agentRegistry` only when all consumers are migrated and validated.

## Files introduced in 12E.2A

| Path | Purpose |
|------|---------|
| `shared/printing/endpoints/endpointTypes.ts` | `EndpointType` taxonomy |
| `shared/printing/endpoints/endpointConnectivity.ts` | Connectivity states and evaluation |
| `shared/printing/endpoints/endpointCapabilities.ts` | Platform-neutral capability model |
| `shared/printing/endpoints/endpointRecord.ts` | `EndpointRecord` |
| `shared/printing/endpoints/endpointRegistryContract.ts` | `EndpointRegistry` interface |
| `server/printing/endpointRegistry.ts` | In-memory implementation (unwired) |
| `server/printing/endpointRegistryCompatibility.ts` | Projection and mapping helpers |

## Validation boundary

12E.2A must **not** change:

- Routing (`routingEngine`)
- Assignment (`assignmentService`)
- Resolution (`printerResolutionRegistry`, `resolutionQueries`)
- Execution / transport / dispatch
- Station routing
- `printingRuntimeBootstrap` wiring

Success is measured by `pnpm tsc --noEmit` and unchanged behavior of THERMAL-PRINTING-12C and agent registration flows.
