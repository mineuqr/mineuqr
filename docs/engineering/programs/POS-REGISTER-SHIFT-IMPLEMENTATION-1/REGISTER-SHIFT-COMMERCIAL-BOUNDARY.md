# REGISTER / SHIFT COMMERCIAL BOUNDARY

| Capability | Catalog | Runtime today |
|------------|---------|----------------|
| CRMP Register (CAP-16) / Financial Shift (CAP-17) | projection `register` | **Not** `requireFeature` on CRMP APIs |
| POS terminals | `posTerminals` / `checkLimit` | Enforced by `PosEntitlementService` |

This program does **not** create a POS Register plan, POS Shift plan, add-on, or second entitlement system.

Existing CRMP commercial gating is catalogued but unenforced. Inventing `requireFeature("register")` on CRMP as part of POS wiring would be a new commercial implementation (CE-01). Out of scope. Reuse as-is.
