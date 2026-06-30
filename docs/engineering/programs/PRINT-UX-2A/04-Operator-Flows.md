# PRINT-UX-2A — Operator Flows

---

## Step 1 — Connector

**Question:** Is MineuQR Connector running?

| State | Operator message | Action |
|-------|------------------|--------|
| Offline | Restaurant connector is offline | Start connector |
| Unregistered | Restaurant has not connected | Start connector |
| Unstable | Connection is unstable | Reconnect connector |
| Online | Connector is running | None |

---

## Step 2 — Printer discovery (provisioning dialog)

States: `no_connector` → `connector_offline` → `connector_connecting` → `discovering` → `no_printers_found` | `printers_found` → `provisioning` → `provisioned`

Offline: **never** lists stale/simulated printers.

---

## Step 3 — Printer ready

Operational states: Ready, Offline, Busy, Paper out, Driver error, Not set up, Unavailable — each with one-line guidance.

---

## Step 4 — Printing

Print / Reprint / Test print enabled only when:

- Connector healthy (`connected` | `healthy`)
- Session registered
- Printer ready (non-simulated)
