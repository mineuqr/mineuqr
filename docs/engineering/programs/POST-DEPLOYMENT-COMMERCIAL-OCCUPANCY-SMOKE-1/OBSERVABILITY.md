# OBSERVABILITY

**Program:** POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1

Vercel CLI is not available in this workspace. Raw Production logs were not dumped.

## Summarized findings

| Signal | Result |
|--------|--------|
| GitHub Production deployment `5936622460` | success |
| Vercel commit status for `2a5b7deb` | success |
| Live `GET /` | 200, no 500 |
| `GET /api/realtime/health` | 200 |
| Public catalog status / listOfferings | 200 |
| Schema / occupancy / missing-module text in responses | none |
| Occupancy lock rows after deploy | 0 — no runtime occupancy writes observed |
| Subscription resolution on public catalog | operational |
| POS provisioning failures | none (no POS rows; no provision attempted) |

No deadlock, lock-wait, or Commercial occupancy error was observed in the available deployment status and HTTP surfaces.

Critical runtime errors: **none found**.
