# PLATFORM OWNER VALIDATION

No new bypass. `resolveFullPlatformEntitlements` → `allCurrentFeatures()` iterates `FEATURE_KEYS`, which now includes the four keys.

Matrix test: FULL_PLATFORM grants all four; ordinary customer with keys omitted is denied.

Customers cannot set FULL_PLATFORM (existing owner-access router).
