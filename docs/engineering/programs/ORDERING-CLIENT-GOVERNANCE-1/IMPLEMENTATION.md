# ORDERING-CLIENT-GOVERNANCE-1 — Implementation
## Certification Report

**Program:** ORDERING-CLIENT-GOVERNANCE-1  
**Type:** Architecture Governance and Hardening  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

Ordering Client Platform governance is hardened before additional Ordering Channels. Permanent architectural guards enforce that channels compose the Client Platform only. `CartScopeAdapter` and `OrderingNavigator` are extended additively for Kiosk and Waiter without breaking QR. No user-facing features or UX redesign were introduced.

---

## 2. Governance audit / ownership compliance

See `ARCHITECTURE.md` §1. **Result: compliant.** No blocking boundary violations.

---

## 3. Dependency graph

See `ARCHITECTURE.md` §2. Sole supported path:

`Channel → Client Platform → Runtime → Ordering Platform`

---

## 4. Boundary violations

| Finding | Severity | Disposition |
|---------|----------|-------------|
| None blocking | — | — |
| Deprecated `useQrOrderingRuntime` | Soft | Documented; pages must not add call sites |
| CartDrawer path fallback | Soft | Navigator preferred; fallback retained (no UX change) |

---

## 5. Files changed

| File | Change |
|------|--------|
| `ordering-client/governance/orderingClientGovernance.ts` | **New** normative ownership/dependency constants |
| `ordering-client/contracts/CartScopeAdapter.ts` | Additive fields (`deviceSessionId`, `stationId`, …) |
| `ordering-client/contracts/OrderingNavigator.ts` | `goToCart` + `goToConfirmation` |
| `ordering-client/contracts/createChannelCartScopeAdapters.ts` | **New** kiosk/waiter adapter factories |
| `ordering-client/qr/createQrOrderingNavigator.ts` | Full stage surface |
| `ordering-client/index.ts` | Governance + factory exports |
| `hooks/useQrOrderingRuntime.ts` | Deprecated (no new call sites) |
| Governance + runtime tests | Permanent guards |
| ADR-ARCH-018 + program docs | Accepted / certified |

---

## 6. Architectural guard tests

| Suite | Role |
|-------|------|
| `orderingClientGovernance.architecture.guards.test.ts` | Umbrella permanent guards |
| Prior RUNTIME/CART/BROWSE/CHECKOUT guards | Remain in force |

Guards assert:

- Layer stack + ownership constants  
- Client Platform owns cart/browse/checkout/runtime modules  
- QR pages do not own orchestration or import `@shared/ordering-platform`  
- Sole `getRuntimeBySlug` consumer is `useOrderingRuntime`  
- Navigator full stage surface  
- Kiosk/Waiter cart scope factories + QR key builder  

---

## 7. Documentation summary

| Doc | Content |
|-----|---------|
| `ARCHITECTURE.md` | Audit, compliance, dependency graph, contracts |
| `IMPLEMENTATION.md` | This certification |
| ADR-ARCH-018 | Accepted; governance rules |

---

## 8. Build result

```
npm run build — SUCCESS
```

Governance + Client Platform guard suites: **30/30 Pass**

---

## 9. Certification report

| Criterion | Status |
|-----------|--------|
| Channels cannot bypass Client Platform | ✓ |
| Cart/browse/checkout/runtime ownership enforced | ✓ |
| Adapters sufficient for QR/Kiosk/Waiter | ✓ |
| Dependency rules documented + guarded | ✓ |
| No new UX / features | ✓ |
| Out-of-scope surfaces untouched | ✓ |

**ORDERING-CLIENT-GOVERNANCE-1 is CERTIFIED.**

Kiosk and Waiter UI programs may proceed only by composing Ordering Client Platform hosts + adapters.
