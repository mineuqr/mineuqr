# REGRESSION REPORT

| Field | Value |
|-------|-------|
| **Program** | SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 |
| **Date** | 2026-07-30 |
| **Mode** | Validation Only |

---

## Change blast radius (this program)

Touched surfaces:

- `server/subscription-runtime/**` (new)
- `server/commercial/getCommercialEntitlements.ts` (delegate)
- `server/commercial/guestOrderingAuthority.ts` (`hasFeature`)
- Docs under program package

**Not modified:** Order aggregate, Kitchen, Waiter, Sessions, Checks, Settlement/Refunds, CRMP/Register, Devices, Auth/RBAC, Tenant Identity, Reporting engines, Catalog publishing, Billing.

---

## Domain regression assessment

| Domain | Risk from this program | Validation | Result |
|--------|------------------------|------------|--------|
| Ordering | Guest gate now `hasFeature("ordering")` | guestOrderingAuthority tests 4/4 | **PASS** |
| Kitchen | No code change | Static blast-radius | **PASS** |
| Waiter | No code change | Static | **PASS** |
| Sessions | No code change | Static | **PASS** |
| Checks | No code change | Static | **PASS** |
| Reporting | No code change | Static | **PASS** |
| Refunds | No code change | Static | **PASS** |
| Register Operations | No code change | Static | **PASS** |
| Devices | No code change | Static | **PASS** |
| Authentication | No code change | Static | **PASS** |
| Tenant isolation | Entitlements still keyed by ownerId | Hub tests | **PASS** |

---

## Commercial hub regression

| Suite | Result |
|-------|--------|
| `getCommercialEntitlements.test.ts` | **6/6 PASS** |
| `commercialSnapshotRuntimeAuthority.test.ts` | **6/6 PASS** |

Unbound Legacy Bridge behavior preserved inside Runtime for unbound subscriptions.

---

## Verdict

**No regressions introduced** in non-commercial domains. Commercial entitlement hub remains green.
