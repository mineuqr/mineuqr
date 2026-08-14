# FAILURE-MODES.md

**Rule:** never convert a failed simulation (or failed mode read after a simulated row exists) into Full Platform.

| Failure | Behavior |
|---------|----------|
| Caller is not Platform Owner | Customer chain only. Mode mutations rejected. |
| Mode row missing (first deploy) | Treat as **FULL_PLATFORM** (explicit default). Create the row on first successful owner resolve or first UI load. |
| Mode persistence **read error** | Deny commercial entitlements; show error; do not assume Full Platform. |
| `SIMULATED_PLAN` and `simulatedPlanCode` null | Treat as unavailable; deny; keep mode; require fix/return. |
| Plan code not found / hidden / unreadable | `SIMULATION_UNAVAILABLE`: deny; preserve mode; owner must return or pick another plan. |
| Catalog hydration failure during simulation | Deny; do not fall back to Legacy Bridge Professional via `600001`. |
| Cache miss / cache fail | Recompute; do not serve another user’s or other-mode entry. |
| Mode write fails | Keep previous mode; toast/error; no partial billing side effects (there are none). |

Customer path is unchanged if owner-mode storage is down: customers do not read that table.
