# REGRESSION-VALIDATION.md

## Program tests (new)

| File | Tests | Result |
|------|-------|--------|
| `requireDevicesFeature.test.ts` | 5 | pass |
| `assertDeviceManagementAccess.test.ts` | 4 | pass |
| `deviceCapabilityEnforcement.matrix.test.ts` | 12 | pass |
| `deviceCapabilityEnforcement.guards.test.ts` | 5 | pass |
| `screenNavigationEntitlement.guards.test.ts` | 2 | pass |
| **Subtotal** | **28** | **pass** |

## Related commercial / device suites

| Suite | Tests | Result |
|-------|-------|--------|
| `featureVisibility.test.ts` (includes devices flag) | 15 | pass |
| `deviceManagementArchitecture.test.ts` | 8 | pass |
| `screenPairingPlatformGovernance.guards.test.ts` | 9 | pass |
| `screenPairingGovernance.test.ts` | 6 | pass |
| `screenCredentialGovernance.test.ts` | 9 | pass |
| `subscriptionRuntimeEntitlement.guards.test.ts` | 5 | pass |
| `subscriptionRuntimeEntitlement.enforcement.test.ts` | 10 | pass |
| `commercialCapabilityOperationalValidation.test.ts` | 8 | pass |
| `commercialPlatformAdoption.guards.test.ts` | 5 | pass |
| `guestOrderingAuthority.test.ts` | 4 | pass |
| `platform-owner-access/__tests__/*` | 25 | pass |

Owner/runtime/device regression batch: **13 files, 64 passed**.

## Pre-existing baseline (not this program)

`waiterNavigationAdoption.architecture.guards.test.ts`: App waiter route count expected 7, observed 8. Unrelated to entitlement enforcement. Not introduced by this repair.

## Build / typecheck

| Gate | Result |
|------|--------|
| `pnpm build` | **pass** (vite + esbuild) |
| `pnpm check` | Baseline errors remain (MapIterator / unrelated Dashboard lines 2269, 3178). **No new errors** in changed authorization, management, fleet, sidebar, workspace, or provisioning files. |

## Unchanged by this program

Live Plan Editor, Pricing, Checkout, subscriptions, invoices, payments, Owner Access Mode, Full Platform resolver, customer entitlement hub, Legacy unbound path, restaurant RBAC, device runtime, kitchen runtime, printing, ordering.
