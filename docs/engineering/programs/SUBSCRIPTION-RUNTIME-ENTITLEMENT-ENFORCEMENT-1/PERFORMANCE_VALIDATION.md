# PERFORMANCE VALIDATION

| Field | Value |
|-------|-------|
| **Program** | SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 |
| **Date** | 2026-07-30 |
| **Mode** | Validation Only (code + test timing; no load lab) |

---

## Measured (Vitest collect/run)

Targeted validation suite (31 tests): **~6.5s** wall including transform/collect; test body **~52ms** aggregate — indicates resolver/lifecycle unit paths are lightweight in-process.

---

## Resolver latency

| Path | Characterization |
|------|------------------|
| Bound Snapshot resolve | In-memory assemble from loaded payload + lifecycle sync (O(features+limits)) |
| Unbound Legacy | Existing context adapter (unchanged) |
| Fail-closed | Constant-time deny DTO |

No synchronous Catalog graph walk on bound path.

---

## Snapshot loading

| Step | Notes |
|------|-------|
| Binding lookup | Single-row by `subscriptionId` |
| Hydrate | Store get + DB hydrate if cold |
| Runtime | Read-only; no freeze/write |

---

## Cache behavior

| Property | Value |
|----------|--------|
| Default | **Off** (`useCache` opt-in) — correctness preferred |
| When enabled | TTL 5s; key `ownerId:secondBucket` |
| Invalidation | `notifySubscriptionLifecycleChanged` / `invalidateEntitlementCache` |
| Memory | Process `Map`; bounded by active owners × TTL |

**Safety:** Cache stores decision DTOs only — never mutates Snapshot payloads.

---

## Repeated authorization

`hasFeature` / `checkEntitlement` / `checkLimit` each call `resolveOwnerEntitlements`. With cache off, repeated calls re-resolve (deterministic, slightly higher cost). With cache on, repeated calls within TTL reuse DTO.

---

## Performance verdict

**ACCEPTABLE for production** for the implemented Runtime Platform under validation conditions. No memory-unsafe Snapshot mutation patterns found. Recommend enabling opt-in cache only behind measured production traffic if needed.
