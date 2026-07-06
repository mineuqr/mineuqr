# RUNTIME-CAPABILITY-NEGOTIATION-1 — Runtime Capability Negotiation Architecture
## Phase C — Certification Report

**Program:** RUNTIME-CAPABILITY-NEGOTIATION-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-06  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

RUNTIME-CAPABILITY-NEGOTIATION-1 evolves the Operational Screen Platform from a **role-driven** runtime into a **capability-driven** runtime. Workspaces and presentation now negotiate capabilities through a single `RuntimeCapabilityNegotiator` and consume the `RuntimeCapabilityContract` — never role names. Capability providers (category filtering, display density, configuration, health, diagnostics, kitchen queue, print monitor, presentation) register in `RuntimeCapabilityRegistry`. Health and diagnostics include negotiation status. Fleet and provisioning use `negotiateManagementCapabilities` without role checks. Authentication, bootstrap, configuration pipeline, state model, APIs, and database remain unchanged.

---

## 2. Root Cause Analysis

Before this program, capabilities were fragmented:

| Layer | Source |
|-------|--------|
| Role registry | `RoleCapabilityDeclaration` booleans |
| Server | `deriveServerCapabilities` with hardcoded `canAccessPrintMonitor: false` |
| Managers | Inline `negotiateTrackedFields` activation |
| Presentation | Binary `presentationKey: "kitchen" \| "blocked"` |
| Streams | Ungated `getKitchenQueue` queries |
| Fleet | Duplicate `OPERATIONAL_ROLES` hardcode (server) |

Presentation indirectly depended on role operational flags. Future roles could not activate without workspace changes.

---

## 3. Architecture Decision

**Decision:** Introduce canonical capability negotiation with providers, adapters, and a single public contract on runtime context.

**Rationale:**
- Workspaces negotiate — they do not inspect roles
- Negotiation results are canonical enums, not booleans
- Providers are extensible without presentation changes
- Health/diagnostics become negotiation-aware
- Fleet/provisioning use management capability contract

---

## 4. Runtime Capability Architecture

```
Workspace / Presentation
        │
        ▼
Capability Request (CapabilityId)
        │
        ▼
RuntimeCapabilityNegotiator
        │
        ▼
RuntimeCapabilityRegistry
        │
        ├→ CategoryFilteringProvider
        ├→ DisplayDensityProvider
        ├→ ConfigurationProvider
        ├→ HealthProvider
        ├→ DiagnosticsProvider
        ├→ KitchenQueueProvider
        ├→ PrintMonitorProvider
        └→ PresentationTicketsProvider
        │
        ▼
CapabilityAdapter (status, metadata, actions, state)
        │
        ▼
RuntimeCapabilityContract
```

---

## 5. Capability Contract

```typescript
RuntimeCapabilityContract {
  runtimeVersion, role
  capabilities: Record<CapabilityId, CapabilityAdapter>
  supportedFeatures: CapabilityId[]
  configurationSupport: NegotiationResult
  presentationSupport: NegotiationResult
  healthSupport: NegotiationResult
  diagnosticsSupport: NegotiationResult
  version, updatedAt
  negotiationSummary { supported, unsupported, blocked, unavailable, failures }
}

NegotiationResult = supported | unsupported | blocked | unavailable | deprecated
```

---

## 6. Capability Registry

`RuntimeCapabilityRegistry` — exactly one registry:

- Registers capability providers
- Normalizes negotiation output
- Versions contract (`version` counter)
- Publishes `RuntimeCapabilityContract`

---

## 7. Capability Negotiator

`RuntimeCapabilityNegotiator`:

- Reads role declarations + server permissions + activation flags
- Resolves requested capabilities via registry
- Validates support with canonical results
- Maintains negotiation timeline for diagnostics
- Exposes `resolve(capabilityId)` for adapters

---

## 8. Capability Providers

| Provider | Capability ID |
|----------|---------------|
| CategoryFilteringProvider | `category_filtering` |
| DisplayDensityProvider | `display_density` |
| ConfigurationProvider | `configuration` |
| HealthProvider | `health` |
| DiagnosticsProvider | `diagnostics` |
| ProvisioningProvider | `provisioning` (unavailable on device runtime) |
| KitchenQueueProvider | `kitchen_queue` |
| PrintMonitorProvider | `print_monitor` |
| PresentationTicketsProvider | `presentation_tickets` |

---

## 9. Capability Adapters

Every capability returns:

```typescript
CapabilityAdapter {
  capabilityId, status, metadata, actions, configuration, state
  providerSource, version
}
```

Workspaces use adapters only — not role internals.

---

## 10. Negotiation Flow

```
Workspace → resolveCapability(id) / runtimeCapabilities
         → Negotiator → Provider → Adapter → Presentation
```

`resolveCapabilityPresentation(contract)` selects UI from `presentation_tickets` status — no `switch(role)`.

---

## 11. Runtime Context

`OperationalScreenRuntimeContext` extended:

```typescript
runtimeCapabilities: RuntimeCapabilityContract
capabilityNegotiator: RuntimeCapabilityNegotiator
resolveCapability: (capabilityId) => CapabilityAdapter | null
```

Orchestrator re-negotiates on configuration/density/category/state changes.

---

## 12. Health Architecture

`mergeCapabilityIntoHealth()` extends `RoleRuntimeHealth` with:

- `capabilityContractVersion`
- `negotiationSummary`
- `unavailableCapabilities`
- `blockedCapabilities`
- `negotiationFailures`

---

## 13. Diagnostics

`projectCapabilityDiagnostics()` includes:

- Capability registry version
- Negotiation timeline
- Capability versions per provider
- Provider sources
- Fallback decisions

Merged into `roleDiagnostics` via orchestrator.

---

## 14. Files Added

| File | Purpose |
|------|---------|
| `capability/runtimeCapabilityContract.ts` | Contract + negotiation types |
| `capability/capabilityProviders.ts` | Nine capability providers |
| `capability/runtimeCapabilityRegistry.ts` | Single registry |
| `capability/runtimeCapabilityNegotiator.ts` | Central negotiator |
| `capability/negotiateRuntimeCapabilities.ts` | Input builder helper |
| `capability/resolveCapabilityPresentation.ts` | Capability-driven presentation |
| `capability/projectCapabilityHealth.ts` | Health projection |
| `capability/projectCapabilityDiagnostics.ts` | Diagnostics projection |
| `capability/managementCapabilityNegotiator.ts` | Fleet/provisioning negotiation |
| `capability/__tests__/runtimeCapabilityNegotiator.test.ts` | Unit tests |

---

## 15. Files Modified

| File | Change |
|------|--------|
| `runtimeTypes.ts` | Context exposes capability contract + negotiator |
| `runtimeCapabilities.ts` | Fixed `canAccessPrintMonitor` derivation |
| `bootstrapLogic.ts` | Initial capability negotiation on context build |
| `useRuntimeOrchestrator.ts` | Live negotiation, health/diagnostics merge |
| `RuntimeRoleHost.tsx` | `resolveCapabilityPresentation`, capability-gated activate |
| `useKitchenRuntimeStream.ts` | Gated on `kitchen_queue` capability |
| `ScreenDiagnosticsPanel.tsx` | Uses `runtimeCapabilities`, not `getRoleCapabilities` |
| `FleetScreenCard.tsx` | `negotiateManagementCapabilities` for provision button |
| `roles/runtimeRoleContract.ts` | Health capability extension fields |
| `__tests__/architectureGuards.test.ts` | RUNTIME-CAPABILITY-NEGOTIATION-1 guard |

---

## 16. Validation

| Criterion | Status |
|-----------|--------|
| RuntimeCapabilityContract | ✓ |
| RuntimeCapabilityRegistry | ✓ |
| RuntimeCapabilityNegotiator | ✓ |
| Capability Providers | ✓ |
| Capability Adapters | ✓ |
| Workspace capability-driven | ✓ |
| No role checks in presentation | ✓ |
| Runtime Context updated | ✓ |
| Health updated | ✓ |
| Diagnostics updated | ✓ |
| Future roles need no workspace changes | ✓ (add provider only) |

---

## 17. Test Results

```
vitest run client/src/lib/operational-screen client/src/lib/screen-fleet client/src/lib/screen-provisioning

 Test Files  16 passed (16)
      Tests  88 passed (88)

tsc --noEmit → clean
```

**New tests (5):** `runtimeCapabilityNegotiator.test.ts`  
**New architecture guard:** RUNTIME-CAPABILITY-NEGOTIATION-1

---

## 18. Performance Validation

- Negotiation runs in orchestrator `useMemo` — recomputes only when role, config activation, or screen state changes
- No additional network requests
- Registry lookup O(capabilities) — 9 fixed providers
- Kitchen stream disabled when capability unsupported — eliminates unnecessary API calls

---

## 19. Production Risks

| Risk | Mitigation |
|------|------------|
| Presentation still binary (kitchen/blocked) | `presentation_tickets` capability extensible to more presentation types |
| Role lifecycle still uses registry internally | Lifecycle is role layer; presentation/workspace are capability-driven |
| `getRoleCapabilities` deprecated but retained for config manager | Config manager still uses declarations; activation via negotiator flags |

---

## 20. Future Programs

| Program | Capability |
|---------|------------|
| Notifications | `notifications` provider |
| Printing | `print_monitor` presentation wiring |
| Timeline | `timeline` provider |
| Customer Display | New provider + presentation capability |
| Pickup Display | `supportsQueue` presentation when operational |

---

## 21. Architecture Compliance Review

| Rule | Compliance |
|------|------------|
| No role checks in presentation | ✓ |
| No switch(role) in presentation | ✓ |
| No hardcoded kitchen/expo logic in UI | ✓ |
| No duplicate capability checks | ✓ Central negotiator |
| No UI feature flags | ✓ |
| Single registry | ✓ |
| Single negotiator | ✓ |
| API/DB/auth unchanged | ✓ |

---

## 22. Evidence

### Presentation resolution

```typescript
const Presentation = resolveCapabilityPresentation(context.runtimeCapabilities);
```

### Kitchen stream gating

```typescript
const kitchenQueueSupported = isCapabilitySupported(context?.runtimeCapabilities, "kitchen_queue");
enabled: kitchenQueueSupported
```

### Fleet provisioning negotiation

```typescript
const managementCapabilities = negotiateManagementCapabilities(screen);
needsProvisioning = isManagementCapabilitySupported(managementCapabilities, "provisioning");
```

### Architecture guard assertions

- `RuntimeRoleHost` uses `resolveCapabilityPresentation`, not `resolveRolePresentation`
- `ScreenDiagnosticsPanel` uses `runtimeCapabilities`, not `getRoleCapabilities`
- `useKitchenRuntimeStream` contains `isCapabilitySupported`, not `kitchen_display`

---

## 23. Final Certification Decision

**CERTIFIED**

RUNTIME-CAPABILITY-NEGOTIATION-1 Phase C is complete. The Operational Screen Platform is now capability-driven. Workspaces depend exclusively on negotiated runtime capabilities. All 88 related tests pass. TypeScript compiles cleanly. Future runtime roles require only new capability providers — not workspace modifications.
