# KIOSK-SCREEN-ACTIVATION-1 — Architecture

**Status:** Implemented  
**Depends on:** SELF-ORDERING-KIOSK-PLATFORM-1, KIOSK-IDENTITY-ADOPTION-1, ROLE-RUNTIME-1, ADR-ARCH-018, ADR-ARCH-019  
**Date:** 2026-07-14  
**Type:** Screen Platform Activation

---

## 1. Architecture audit

| Layer | Prior state | Finding |
|-------|-------------|---------|
| Pairing / provisioning | Working | Role `self_ordering_kiosk` provisioned correctly |
| Runtime bootstrap | Working | Credentials + heartbeat succeed |
| Role registry | `createBlockedRoleDefinition` | **Activation stop** — `operational: false` |
| Orchestrator | `isBlockedRole` → `RUN_BLOCKED` | Mounts waiting/blocked UI |
| Capability presentation | Only `presentation_tickets` | No kiosk host path |
| KioskShell | `/kiosk/:slug` only | Never reached from `/screen` |

### Root cause

`selfOrderingKioskRole` was intentionally blocked by ROLE-RUNTIME-1 (“future program”). Screen Runtime recognized the role but never selected a kiosk presentation host — it mounted `BlockedRolePresentation`.

---

## 2. Screen activation ownership

| Owner | Responsibility |
|-------|----------------|
| Screen Platform | Pairing, provisioning, runtime lifecycle, **activation** (role → capability → presentation) |
| Kiosk Platform | Idle, touch-to-start, language, session reset, device chrome |
| Ordering Client Platform | Browse, cart, checkout, submission |

**Forbidden:** Screen Platform owning browse/cart/checkout; Kiosk owning pairing/provisioning.

---

## 3. Runtime activation flow

```
Pairing → Provisioning (role = self_ordering_kiosk)
        ↓
Screen Runtime bootstrap (/screen)
        ↓
Role registry: operational + presentationKey "kiosk"
        ↓
Capability negotiation: presentation_kiosk = supported
        ↓
resolveCapabilityPresentation → KioskRolePresentation
        ↓
KioskShell(activation: { slug, stationId, restaurantId, kioskId })
        ↓
Idle → Language → Ordering Client Platform stages → Confirmation → Reset
```

`getStatus` exposes `restaurantSlug` so Screen Runtime can host KioskShell without URL redirects.

---

## 4. Architectural boundaries

**In scope:** Role operationalization, `presentation_kiosk` capability, KioskRolePresentation, Screen Runtime slug, host-stage navigation for KioskShell  

**Out of scope:** Ordering Platform / Domain / Projection / Kitchen / Expo / Print / QR redesign / Kiosk UX redesign  

**Preserved:** `/kiosk/:slug` channel routes remain valid; Screen Runtime does not duplicate App routes.
