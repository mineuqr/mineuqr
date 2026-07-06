# OPERATIONAL-BUGFIX-1D — Runtime Configuration UX & Authentication Taxonomy (F-009 / F-010)

**Classification:** Product Readiness  
**Priority:** High  
**Status:** COMPLETE — awaiting certification

## Root Cause

Two independent operator-facing gaps remained after BUGFIX-1A–1C:

| ID | Failure | Root cause |
|----|---------|------------|
| **F-009** | Screen settings misrepresent runtime | `ScreenSettingsSheet` and `screenConfig.ts` comments still described density/category filtering as deferred via `KITCHEN-DISPLAY-DENSITY-1` / `KITCHEN-CATEGORY-FILTER-1`, while `RuntimeConfigurationManager`, `RuntimeDisplayDensityManager`, and `RuntimeCategoryFilterManager` already apply those settings on kitchen/expo after configuration reload |
| **F-010** | Auth failures indistinguishable | `OperationalDeviceAuthService.authenticate()` returned `invalid_credentials` for every failure because `validateCredentials()` collapsed disabled device, revoked token, expired token, and bad secret into `null` |

Operators could not trust Screen Settings copy or determine why pairing failed.

## Architecture Compliance

| Constraint | Compliance |
|------------|------------|
| No architecture changes | ✓ Messaging and auth classification only |
| No runtime redesign | ✓ Orchestrator, managers, reload path untouched |
| No capability negotiation changes | ✓ Untouched |
| No UX redesign outside runtime consistency | ✓ Same sheet layout; copy and badges corrected |
| No unrelated refactoring | ✓ Scoped to settings messaging + auth taxonomy |
| Certified patterns preserved | ✓ `validateCredentials()` still returns session or null for middleware; router contract unchanged |

## Implementation Summary

### F-009 — Runtime configuration consistency

- **`screenSettingsRuntimeMessaging.ts`** — role-aware copy: kitchen/expo show “Active at runtime”; other roles show “Stored”; sheet description references configuration reload (~60s status poll)
- **`ScreenSettingsSheet.tsx`** — uses messaging helpers; removed “future programs” / “Activates later via KITCHEN-*” text
- **`screenConfig.ts`** — domain comments synchronized with actual runtime application on kitchen/expo

Runtime behavior unchanged: category filter and display density still flow through existing managers after `configVersion` / `screenConfigRevision` change.

### F-010 — Authentication error taxonomy

- **`deviceAuthCodes.ts`** — canonical failure code union and guard
- **`OperationalDeviceAuthService.ts`** — `resolveCredentialOutcome()` classifies failures in operational order:
  - unknown device / wrong token / bad secret → `invalid_credentials`
  - disabled device → `device_disabled`
  - revoked or rotated token → `token_revoked`
  - past `expiresAt` → `token_expired`
- **`pairingAuthMessages.ts`** — maps codes to operator-safe EN/AR messages (no raw codes or internals)
- **`PairingShell.tsx`** — uses `resolvePairingAuthMessage()` instead of raw `err.message`
- **`bootstrapLogic.ts`** — `isDeviceAuthError()` includes `token_expired`

Router still throws `TRPCError({ code: "UNAUTHORIZED", message: result.code })`; middleware unchanged.

### Files changed

| File | Change |
|------|--------|
| `server/operational-device/domain/deviceAuthCodes.ts` | **New** — failure code taxonomy |
| `server/operational-device/services/OperationalDeviceAuthService.ts` | Distinct failure classification |
| `server/operational-device/domain/screenConfig.ts` | Comment sync |
| `client/src/lib/screen-management/screenSettingsRuntimeMessaging.ts` | **New** — runtime-accurate copy |
| `client/src/components/screen-management/ScreenSettingsSheet.tsx` | Use messaging helpers |
| `client/src/lib/operational-screen/pairing/pairingAuthMessages.ts` | **New** — operator messages |
| `client/src/components/operational-screen/PairingShell.tsx` | Mapped pairing errors |
| `client/src/lib/operational-screen/bootstrapLogic.ts` | `token_expired` in auth error detection |

### Tests added / updated

| File | Coverage |
|------|----------|
| `server/operational-device/__tests__/deviceAuthTaxonomy.test.ts` | **New** — all failure codes + no collapse guard |
| `server/operational-device/__tests__/OperationalDeviceServices.test.ts` | Revoked token returns `token_revoked` |
| `client/src/lib/screen-management/__tests__/screenSettingsRuntimeMessaging.test.ts` | **New** — role-aware messaging, no stale program refs |
| `client/src/lib/operational-screen/pairing/__tests__/pairingAuthMessages.test.ts` | **New** — operator-safe message mapping |
| `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts` | F-009 / F-010 regression guards |
| `server/operational-device/__tests__/deviceManagementArchitecture.test.ts` | F-009 / F-010 server guards |

## Validation Results

| Check | Result |
|-------|--------|
| Runtime configuration messaging matches behavior | ✓ |
| Category filtering behavior unchanged | ✓ |
| Display density behavior unchanged | ✓ |
| Runtime reload unchanged | ✓ |
| Disabled device reported correctly | ✓ `device_disabled` |
| Revoked credential reported correctly | ✓ `token_revoked` |
| Expired credential reported correctly | ✓ `token_expired` |
| Invalid credential reported correctly | ✓ `invalid_credentials` |
| Runtime bootstrap unaffected | ✓ |
| Provisioning unaffected | ✓ |
| Fleet unaffected | ✓ |
| Architecture unchanged | ✓ |

**Commands run:**

```
npx vitest run server/operational-device/__tests__/deviceAuthTaxonomy.test.ts \
  server/operational-device/__tests__/OperationalDeviceServices.test.ts \
  server/operational-device/__tests__/deviceManagementArchitecture.test.ts \
  client/src/lib/screen-management/__tests__/screenSettingsRuntimeMessaging.test.ts \
  client/src/lib/operational-screen/pairing/__tests__/pairingAuthMessages.test.ts \
  client/src/lib/operational-screen/__tests__/architectureGuards.test.ts
npx tsc --noEmit
```

All scoped tests passed; `tsc --noEmit` clean.

## Runtime Behavior Before vs After

### Screen settings (F-009)

| Aspect | Before | After |
|--------|--------|-------|
| Sheet description | “unchanged until future programs activate” | Applied after configuration reload (~1 min) |
| Density badge (kitchen/expo) | “Saved for later” / KITCHEN-DISPLAY-DENSITY-1 | “Active at runtime” |
| Category badge (kitchen/expo) | “Saved — no filtering yet” / KITCHEN-CATEGORY-FILTER-1 | “Active at runtime”; empty = all orders |
| Non-kitchen roles | Implied future activation | “Stored — not active for this role at runtime yet” |
| Actual runtime | Already applied density/filter on reload | **Unchanged** |

### Pairing authentication (F-010)

| Condition | Before | After |
|-----------|--------|-------|
| Bad secret | `invalid_credentials` (raw in UI) | `invalid_credentials` → operator message |
| Disabled device | `invalid_credentials` | `device_disabled` → “screen has been disabled…” |
| Revoked / rotated token | `invalid_credentials` | `token_revoked` → “request a new pairing code…” |
| Expired token | `invalid_credentials` | `token_expired` → “credentials have expired…” |
| Success | Session issued | **Unchanged** |

## Production Acceptance

- Operators editing kitchen/expo screen settings see accurate runtime activation copy.
- Operators pairing a screen receive distinct, actionable messages per failure type.
- No API, schema, capability negotiation, or runtime pipeline changes.
- Regression guards prevent return to generic auth errors or stale “activates later” messaging.

**Awaiting certification before OPERATIONAL-BUGFIX-1E or subsequent phases.**
