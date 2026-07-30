# RESIDUAL REVIEW — Post-Certification Hardening

| Field | Value |
|-------|-------|
| **Program** | SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 |
| **Mode** | Architecture Authority · Investigation Only · Documentation Only |
| **Date** | 2026-07-30 |
| **Constraints** | No runtime behavior changes · No architecture redesign · No DB/API/feature changes · No commits |

---

## Mission

Classify residual helpers identified at Production Certification and determine whether they violate certified Runtime Entitlement governance or constitute non-blocking technical debt.

---

## Residual items under review

| Helper | Location |
|--------|----------|
| `resolvePlanLimitsForUser` | `server/subscriptionPlanLimits.ts` |
| `isSubscriptionActive` | `server/db.ts` → `userHasSubscriptionEntitlement` / `resolveSubscriptionEntitlement` |

---

## 1. `resolvePlanLimitsForUser`

### Behavior (evidence)

```
getSubscriptionsByUser
  → pick row (account or restaurant-scoped)
  → resolveSubscriptionEntitlement(sub)          // period/status gate
  → if bound: resolveCommercialFactsFromSnapshot // Snapshot hydrate
       → snapshotQuotaLimits(snapshot)           // OR fail-closed zeros
  → if unbound: getSubscriptionPlanById          // Legacy Bridge
  → else: getFallbackBasicLimits()               // Legacy plans list
```

Does **not** call: `resolveOwnerEntitlements`, `EntitlementResolver`, `checkLimit`, `hasFeature`, `checkEntitlement`, `requireFeature`.

Bound path: **Snapshot facts only** (or fail-closed). Does **not** read mutable Catalog Plan Versions for bound entitlements.

### Review answers

| Question | Answer |
|----------|--------|
| Independent entitlement decisions? | **Yes — independent limit-cap resolution** (parallel to `checkLimit`) |
| Bypasses canonical Runtime interfaces? | **Yes** (does not delegate to Runtime Service / `checkLimit`) |
| Duplicated entitlement logic? | **Yes — duplicate branch pattern** (Bound Snapshot \| unbound Legacy) and quota extraction via `snapshotQuotaLimits` vs Runtime `readLimitValue` |
| Duplicated lifecycle logic? | **Partial** — uses `resolveSubscriptionEntitlement` (trial/active/canceled/expired periods only); does **not** apply Runtime Grace/Suspended overlays (`lifecycleOverlay`) |
| Future architectural risk? | **Moderate** — quota asserts may diverge from Runtime if Grace/Suspended enabled or limit DTO evolves; unbound still reads `subscription_plans` (Legacy, not Catalog Versions) |

### Classification

**C — Duplicate Runtime Logic**

(with Legacy Compatibility characteristics on the unbound branch)

**Not D — Architectural Risk** as a certification-breaking violation: bound path remains Snapshot-invariant-compliant and fail-closed.

**Not A — Canonical Wrapper:** does not thin-delegate to `checkLimit`.

---

## 2. `isSubscriptionActive`

### Behavior (evidence)

```
isSubscriptionActive(userId)
  → getSubscriptionsByUser
  → userHasSubscriptionEntitlement(rows)
  → resolveSubscriptionEntitlement on candidate rows
  → boolean: any period-valid trial/active
```

Does **not** load Snapshots, Catalog, Feature maps, or Limit maps.

Does **not** call Runtime Feature/Limit APIs.

Consumers include coarse gates in `server/routers.ts` and fallbacks in `wave1ReadAuthority.ts`.

### Review answers

| Question | Answer |
|----------|--------|
| Independent **Feature/Limit** entitlement decisions? | **No** — period/status presence only |
| Independent commercial capability authorization? | **No** (cannot grant `ordering`, quotas, etc.) |
| Bypasses Runtime Feature APIs? | **Yes if misused as Feature auth**; **N/A** for pure period probes |
| Duplicated Feature entitlement logic? | **No** |
| Duplicated lifecycle logic? | **Overlap only** with period validity subset of Runtime lifecycle (no Grace/Suspended signals) |
| Future architectural risk? | **Low–Moderate misuse risk** if callers treat “active subscription” as Feature entitlement |

### Classification

**B — Legacy Compatibility Wrapper**

(period entitlement helper; not a Feature/Limit decision engine)

Elevated note: **misuse as Feature authorization** would become **D — Architectural Risk**; current legitimate use is coarse “has entitled period” gating, which is outside the Feature matrix.

---

## Architecture impact

| Concern | Impact |
|---------|--------|
| Commercial Snapshot Invariant | **Preserved** — bound quota path reads frozen Snapshot / fail-closed |
| I-CPL-13 | **Preserved** — helpers do not mutate/repoint Snapshots |
| I-SRE-01 (exclusive Runtime for commercial Features/Limits) | **Debt** — quota path is a parallel Limit decision surface; not a Catalog path |
| I-SRE-02 | **Preserved** — matrix completeness unchanged; helpers do not add orphan capabilities |
| Mutable Catalog at entitlement time | **Not introduced** by these helpers on bound paths |
| Runtime authorization bypass of Features | **`isSubscriptionActive` does not bypass Feature resolver**; **`resolvePlanLimitsForUser` bypasses `checkLimit` only** |

### “Alternate entitlement path” clarification

| Path type | Present? | Certification reading |
|-----------|----------|------------------------|
| Alternate **Feature** decision engine | **No** in these two helpers | Compliant |
| Parallel **Limit** consumer not yet thin-wrapped | **Yes** (`resolvePlanLimitsForUser`) | Technical debt; Snapshot-safe |
| Mutable Catalog entitlement resolve | **No** (bound) | Compliant |
| Canonical Runtime for Features (`hasFeature` / hub) | **Intact** | Compliant |

These residuals do **not** reintroduce a Catalog-backed commercial decision SSOT and do **not** invalidate the certified Runtime Platform.

---

## Risk assessment

| Helper | Risk level | Primary risk |
|--------|------------|--------------|
| `resolvePlanLimitsForUser` | Medium (debt) | Divergence from Runtime Grace/Suspended and from `checkLimit` semantics; dual maintainership of Snapshot\|Legacy branch |
| `isSubscriptionActive` | Low (debt) / Medium if misused | Callers may confuse period gate with Feature entitlement |

No evidence of Snapshot mutation, Catalog Version reads for bound Feature maps, or dual active Snapshot binding from these helpers.

---

## Technical debt assessment

| Item | Debt type | Severity | Blocks Production Certification? |
|------|-----------|----------|----------------------------------|
| `resolvePlanLimitsForUser` | Convergence to `checkLimit` / Runtime | Medium | **No** |
| Assert helpers using it | Same | Medium | **No** |
| `isSubscriptionActive` | Replace Feature-sensitive gates with `hasFeature` | Low–Medium | **No** |

---

## Future hardening recommendation (DO NOT IMPLEMENT in this review)

### `resolvePlanLimitsForUser`

1. **Thin wrapper / delegation only**  
   - Resolve caps via `resolveOwnerEntitlements` → `checkLimit` (or shared internal Runtime quota projector).  
   - Preserve restaurant-scoped row selection as a **selection input** to Runtime, not a second entitlement engine.
2. **Deprecation path**  
   - Mark `resolvePlanLimitsForUser` as `@deprecated` compatibility API once asserts call Runtime.  
   - Keep unbound Legacy behavior inside Runtime’s existing Legacy Bridge branch only.
3. **Compatibility**  
   - Keep Arabic TRPC error messages at assert layer.  
   - Preserve fail-closed zeros for bound + unreadable Snapshot.
4. **Lifecycle**  
   - Ensure Grace/Suspended overlays apply identically to quota and Feature decisions (single `syncCommercialLifecycle`).

### `isSubscriptionActive`

1. **Keep** as period helper **or** rename for clarity (`hasPeriodValidSubscription`).  
2. **Migration notes** — any gate that intends Feature authorization MUST use `hasFeature` / `checkEntitlement` / `requireFeature`.  
3. **Do not** teach `isSubscriptionActive` as commercial capability entitlement.

---

## Validation of certified invariants

| Invariant | Status |
|-----------|--------|
| Commercial Snapshot Invariant | **Preserved** |
| I-CPL-13 Snapshot Identity | **Preserved** |
| I-SRE-01 Runtime Entitlement Authority | **Preserved** for canonical Runtime; residual Limit parallel path = debt, not Catalog authority |
| I-SRE-02 Capability Enforcement Completeness | **Preserved** |
| No mutable Catalog entitlement path (bound) | **Confirmed** |
| No Feature authorization bypass via these helpers | **Confirmed** (`isSubscriptionActive` is not Feature auth) |

---

## Effect on Production Certification

**Residual items are non-blocking technical debt and do not affect Production Certification.**

Both helpers are compatibility / parallel-consumer layers that remain Snapshot-safe on bound paths and do not restore mutable Catalog entitlement authority. They do not revoke **SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 Production Certified** status for the Subscription Runtime Entitlement Platform.

---

## STOP

Review complete. No runtime, architecture, database, API, or feature changes performed.
