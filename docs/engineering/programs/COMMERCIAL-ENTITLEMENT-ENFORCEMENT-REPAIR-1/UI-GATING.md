# UI-GATING.md

Source: `useCommercialFeatureVisibility().hasFeature("devices")` → `getCommercialEntitlements`.

No plan-name checks.

| Surface | Behavior when `devices` is false |
|---------|----------------------------------|
| Sidebar Screens item | Hidden |
| Dashboard screens / provisioning tabs | `CommercialUpgradeBanner` |
| Create Screen CTA | Hidden |
| Provisioning workspace | Upgrade banner |

UI is presentation only. Direct API calls are still denied by the server gate.

Simulated Basic sets `commercial.isAdmin = false`, so the existing `isAdmin` visibility bypass does not leak Screens during simulation.
