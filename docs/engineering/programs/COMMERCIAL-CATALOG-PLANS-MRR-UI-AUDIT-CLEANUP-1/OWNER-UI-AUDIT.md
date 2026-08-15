# OWNER-UI-AUDIT.md

Owner Access Mode architecture was **not** modified.

| Mode | Capabilities | Limits | Prices | Billing | UI |
|------|--------------|--------|--------|---------|-----|
| FULL_PLATFORM | All current commercial keys | Unlimited (`null`) | Display only | No charge; checkout disabled | `OwnerAccessControl` + Pricing note |
| SIMULATED_PLAN | Selected Live Plan | Selected Live Plan current limits | Display only | No checkout | Simulation — No Charge copy |

No commercial expiry on FULL_PLATFORM. Invalid simulation fails closed (`NONE`).

Owner does not enter MRR (`countsInMrr: false`).
