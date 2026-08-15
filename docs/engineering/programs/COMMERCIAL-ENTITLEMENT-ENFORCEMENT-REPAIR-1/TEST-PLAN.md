# TEST-PLAN.md

Implemented in:

- `requireDevicesFeature.test.ts`
- `assertDeviceManagementAccess.test.ts`
- `deviceCapabilityEnforcement.matrix.test.ts`
- `deviceCapabilityEnforcement.guards.test.ts`
- `screenNavigationEntitlement.guards.test.ts`
- `featureVisibility.test.ts` (devices flag, not plan name)

| # | Case | Coverage |
|---|------|----------|
| 1 | Owner Full Platform allowed | matrix |
| 2 | Owner Simulated Basic denied | matrix |
| 3 | Owner Simulated Professional allowed | matrix |
| 4 | Owner Simulated Enterprise allowed | matrix |
| 5 | Full → Basic denies immediately | matrix |
| 6 | Basic → Professional allows immediately | matrix |
| 7 | Professional → Full remains allowed | implied by 1 + 6 |
| 8 | Customer Basic denied | matrix |
| 9 | Customer Professional allowed | matrix |
| 10 | Customer Enterprise allowed | matrix |
| 11 | No restaurant access denied | assertDeviceManagementAccess |
| 12 | No commercial capability denied | matrix + adapter |
| 13 | No authentication | `verifiedProcedure` unchanged |
| 14 | Admin role without capability denied | assertDeviceManagementAccess |
| 15 | Restaurant owner without capability denied | assertDeviceManagementAccess |
| 16–18 | Resolver / missing / invalid fail closed | adapter + matrix |
| 19–21 | Direct API / frontend bypass | server gate on create + siblings |
| 22–25 | UI Basic locked / Pro / Ent / Full | UI guards + hasFeature |

No production writes.
