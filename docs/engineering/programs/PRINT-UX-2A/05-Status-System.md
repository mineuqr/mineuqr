# PRINT-UX-2A — Status System

**Module:** `client/src/lib/print-workspace/operationalViewModels.ts`

---

## System ready

| State | Meaning |
|-------|---------|
| `ready` | Can print |
| `blocked` | Cannot print — see subline |

---

## Printer operational states

`ready` · `offline` · `busy` · `paper_out` · `driver_error` · `unavailable` · `not_configured`

Simulated printer IDs always map to `not_configured`.

---

## Provisioning workflow states

`no_connector` · `connector_offline` · `connector_connecting` · `connector_connected` · `discovering` · `no_printers_found` · `printers_found` · `provisioning` · `provisioned`

---

## Health badges

Reused from PRINT-UX-2 `HealthStatusBadge` with operator labels in `viewModels.ts`.
