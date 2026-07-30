# Architecture Retirement Report

**Program:** LEGACY-COMPATIBILITY-RETIREMENT-1

## Law preserved

```
Discovery → Commercial Projection → Catalog → Plans → Offerings → Runtime
```

Legacy Compatibility remains **transitional**, not permanent SSOT.  
Commercial Projection remains the **only** Commercial Registry for Plan packaging.

## What retirement means in this program

1. Classify every remaining compat artifact with evidence.  
2. Remove only proven UNUSED code (`LEGACY_DIRECT_PROJECTION_KEYS`).  
3. Document BLOCKED / KEEP_TEMPORARILY conditions for everything else.  
4. Encode classification in `legacyRetirement.ts` so future programs cannot guess.

## What retirement does **not** mean yet

- Deleting `LEGACY_COMPAT_FEATURE_KEYS`  
- Migrating UI gates to Projection IDs  
- Rewriting bound snapshots  
- Removing `LEGACY_PLAN_BRIDGE`

Those require evidence of zero production consumers (data audit + UI migration programs).
