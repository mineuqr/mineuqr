# QR-UI-AUDIT.md

Printed QR slugs remain valid after expiry. While FROZEN, the public runtime sets `commercial_frozen: true` and serves `FrozenPublicMenuExperience` — not the active ordering menu.

| State | Public menu | Ordering |
|-------|-------------|----------|
| ACTIVE + ordering entitled | Full runtime | Allowed if `hasFeature("ordering")` |
| FROZEN | Frozen experience | Denied |
| NONE | Depends on restaurant existence; no commercial grant | Denied by entitlement / account state |
| Owner simulation | Owner’s simulated entitlements; public QR is the restaurant’s owner account | Follows that owner’s hub |

Tests: `qrOrderingFrozen.behavior.test.ts`.
