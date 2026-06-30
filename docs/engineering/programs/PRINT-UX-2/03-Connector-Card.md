# PRINT-UX-2 — Connector Card (Section 1)

**Component:** `LocalConnectorCard.tsx`

---

## Fields

| Field | Source |
|-------|--------|
| Connection status | `connectionStatus` badge |
| Healthy / Degraded | `healthLabel` |
| Connector version | `connectorVersion` |
| Runtime platform | `runtimePlatform` |
| Runtime uptime | `runtimeUptimeMs` → formatted |
| Last heartbeat | `lastHeartbeatAt` |
| Connector ID | `connectorInstanceId` |
| Diagnostics | Button → expands Section 4 |

---

## Unregistered State

When no RLC session exists, card shows **Not registered** with muted badge — not simulated or embedded printer messaging.
