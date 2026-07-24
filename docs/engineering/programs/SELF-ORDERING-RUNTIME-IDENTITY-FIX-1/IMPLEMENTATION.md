# SELF-ORDERING-RUNTIME-IDENTITY-FIX-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | SELF-ORDERING-RUNTIME-IDENTITY-FIX-1 |
| **Phase** | Production Runtime Fix (P0) |
| **Date** | 2026-07-24 |
| **Forensics** | [SELF-ORDERING-CART-RUNTIME-FORENSICS-1/FORENSICS.md](../SELF-ORDERING-CART-RUNTIME-FORENSICS-1/FORENSICS.md) |
| **References** | ADR-ARCH-018 · ORDERING-PLATFORM-ARCHITECTURE-1 · SELF-ORDERING-KIOSK-ARCHITECTURE-1 |
| **Verdict** | **RUNTIME IDENTITY FIX CERTIFIED** |

---

## Executive Summary

Restored **Runtime Identity Continuity** for Self Ordering (Kiosk).

The cart store was already correct. Menu → Cart remounts of `KioskShell` minted a new ephemeral `deviceSessionId`, changing the cart `sessionStorage` key and hydrating an empty cart.

**Fix:** Persist journey `deviceSessionId` in `sessionStorage` and reuse it across shell remounts. Rotate only on intentional session boundaries (idle Start / reset). Stage navigation uses `OrderingNavigator` (no raw `/kiosk/...` invent paths in stages).

Single Source of Truth preserved: one `OrderingCartProvider`, one scope key per journey, no dual-key reads, no item migration hacks.

**Architectural principle (constitutional):** Ordering Runtime Identity Invariant — now recorded in [ADR-ARCH-018](../../../architecture/adrs/ADR-ARCH-018-ordering-client-platform.md) Decision §6 and SELF-ORDERING-KIOSK-ARCHITECTURE-1 §6.1.

---

## Root Cause Confirmation

| Trace field | Menu (pre-nav) | Cart (post-nav, before fix) | Cart (after fix) |
|-------------|----------------|----------------------------|------------------|
| `slug` / `station` / `kiosk` | stable | stable | stable |
| `deviceSessionId` | UUID-A | **UUID-B** (regenerated) | **UUID-A** (persisted) |
| Cart `scopeKey` | `...:device:UUID-A:...` | `...:device:UUID-B:...` | `...:device:UUID-A:...` |
| Item count | N | **0** | **N** |

First divergence (forensics): `KioskShell` remount → `useState(() => createKioskDeviceSessionId())`.

---

## Runtime Identity Lifecycle

```
Idle Start / resetSession
  → rotateKioskDeviceSessionId(slug, station, kiosk)  // NEW journey
  → persist under mineuqr:kiosk:deviceSession:{slug}:{station}:{kiosk}

Menu / Cart / Checkout / Confirmation (same journey)
  → loadOrCreateKioskDeviceSessionId(...)             // SAME id
  → CartScopeAdapter deviceSessionId unchanged
  → sessionStorage cart key unchanged

Customer journey end (reset / successful_order / cancel)
  → clear cart (current key) then rotate identity
```

Navigation may still remount `KioskShell` (separate App routes). Identity continuity no longer depends on React instance survival.

---

## Code Changes

| File | Change |
|------|--------|
| `client/src/lib/ordering-client/kiosk/kioskDeviceSessionIdentity.ts` | **New** — load/create/rotate/clear journey deviceSessionId |
| `client/src/pages/kiosk/KioskShell.tsx` | Persist identity; rotate only on Start/reset |
| `client/src/pages/kiosk/KioskBrowseStage.tsx` | `navigator.goToCart()` |
| `client/src/pages/kiosk/KioskCartStage.tsx` | `navigator.goToBrowse()` / `goToCheckout()` |
| `client/src/pages/kiosk/KioskCheckoutStage.tsx` | `navigator.goToCart()` |
| `client/src/lib/ordering-client/index.ts` | Export identity helpers |
| `client/src/lib/ordering-client/__tests__/kioskRuntimeIdentity.fix.test.ts` | **New** regression suite |
| `client/src/lib/ordering-client/__tests__/orderingClientKiosk.architecture.guards.test.ts` | Guards for navigator + persist |

**Not changed:** Cart provider, checkout provider, cart persistence format, Ordering Platform architecture, dual storage.

---

## Runtime Validation

Simulated journey (unit / identity harness):

| Step | Result |
|------|--------|
| Add item under UUID-A key | Items saved |
| Remount → loadOrCreate | Same UUID-A |
| Cart hydrate | Same items |
| Remount → checkout key | Same items (incl. notes/modifiers) |
| Back/forward ×5 remounts | Identity + cart stable |
| Refresh (sessionStorage retained) | Cart quantity preserved |
| Deep link with existing journey | Reuses identity + cart |
| rotate (new journey) | New key; empty cart; old key not dual-read |

Hosted Screen Runtime: navigator `onHostStageNavigate` path avoids URL remount when stages use navigator; URL mode remounts are identity-safe via persistence.

---

## Regression Tests

`kioskRuntimeIdentity.fix.test.ts` + architecture guards — **19 tests passed** (3 files).

Covered:

- Single / multi item continuity  
- Modifier / notes fields on items  
- Back/forward remount loops  
- Browser refresh simulation  
- Deep link into cart/checkout with existing journey  
- Rotate on session boundary  
- Station/kiosk isolation  
- Stages forbid raw `setLocation(\`/kiosk/`  
- Shell forbids ephemeral `createKioskDeviceSessionId` initializer  

---

## Performance Impact

Negligible: one `sessionStorage` get/set per shell mount / rotate. No extra network. No cart key scanning.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Stale journey after abandoned tab | Idle timeout / reset rotates identity |
| Orphan cart keys from pre-fix UUID churn | Harmless; not dual-read; cleared on tab close with sessionStorage |
| Hosted + URL hybrid | Navigator preferred; persist covers remounts |

---

## Production Readiness

| Criterion | Status |
|-----------|--------|
| Runtime identity constant during journey | ✓ |
| `deviceSessionId` stable across menu/cart/checkout remounts | ✓ |
| Cart badge ≡ cart page (same scope key) | ✓ |
| Checkout / payment / confirmation same cart | ✓ |
| No duplicate cart stores / dual-key sync | ✓ |
| SSOT preserved | ✓ |
| Regression tests pass | ✓ |

---

## Final Verdict

**RUNTIME IDENTITY FIX CERTIFIED**
