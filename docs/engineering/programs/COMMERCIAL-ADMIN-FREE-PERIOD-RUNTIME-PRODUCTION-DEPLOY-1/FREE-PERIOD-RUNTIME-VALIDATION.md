# FREE PERIOD RUNTIME VALIDATION

Deployed source (SHA `625280ff`) contains:

- `shared/commercial-concession` calendar (UTC days; civil months; Jan 31 → Feb 28/29)
- `server/commercial/concessions.ts` grant / revise / cancel
- `server/commercial/adminConcessions.ts` + `assertAdminAccess` procedures
- Free-first create: `status=active`, `currentPeriodEnd=endsAt`, no snapshot
- Plan/cycle during current concession: identity only, no snapshot
- Webhook: skip snapshot while concession current; integer compatibility kept
- Invoice: refuse current concession; amount = snapshot
- MRR: suppress current-concession ids

No Production concession was granted. Production concession count remained **0**.
