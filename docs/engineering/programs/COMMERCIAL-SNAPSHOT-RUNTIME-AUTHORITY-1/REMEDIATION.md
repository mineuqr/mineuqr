# REMEDIATION

**Program:** COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1

## Before (NON-COMPLIANT)

```
getCommercialEntitlements
  → ALWAYS Legacy matrix (base)
  → IF Snapshot → overlay features/limits onto base
  → return { ...base, features, limits }   // MIXED / prefer
```

## After (branch only)

```
getCommercialEntitlements
  → lookup SubscriptionBinding
  → IF binding
       → load Snapshot (hydrate from DB if needed)
       → IF payload missing → fail closed (NONE) — NEVER Legacy
       → ELSE resolve ONLY from Snapshot + instance lifecycle
  → ELSE
       → Legacy Bridge ONLY (matrix / context)
```

## Remediations delivered

| Area | Change |
|------|--------|
| Entitlement hub | Removed overlay/`...base`/prefer; branch Snapshot \| Legacy |
| Snapshot assembly | `snapshotRuntimeAuthority.ts` builds features/limits/flags/meta from Snapshot |
| Quotas | `resolvePlanLimitsForUser` Snapshot-only when bound |
| CRS | Bound uses Snapshot `commercialName`; unbound may read `subscription_plans` for display |
| Activation | PayPal, Tap, admin create/update bind Snapshot |
| Transitions | Upgrade/downgrade/renewal create new immutable Snapshot + rebind |
| Hydration | `hydrateCommercialSnapshotById` for fail-closed resolve |
| Observability | Runtime authority metrics; `mixedResolutionCount` fixed at 0 |
| Audit | Bound / activated / upgrade|downgrade|renewal snapshot events |
