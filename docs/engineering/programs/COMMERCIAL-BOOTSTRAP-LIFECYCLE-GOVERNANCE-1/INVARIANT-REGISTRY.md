# INVARIANT REGISTRY — COMMERCIAL-BOOTSTRAP-LIFECYCLE-GOVERNANCE-1

## BOOTSTRAP-01 — Infrastructure Initialization Boundary

**Status:** Normative  
**Owner:** Persistent Catalog Bootstrap (infrastructure initialization)  
**Non-owner:** Commercial Lifecycle Platform (business state)

### Statement

Bootstrap SHALL initialize infrastructure, never repair business state.

Bootstrap is responsible only for initializing an uninitialized persistent platform.

Bootstrap SHALL determine initialization exclusively by infrastructure existence (catalog artifacts), not by business lifecycle state.

Bootstrap SHALL NOT infer business intent.

Bootstrap SHALL NOT recreate, republish, revive, or repair business entities.

Business lifecycle remains exclusively owned by the Commercial Lifecycle Platform.

### Examples

| Persistent catalog | Bootstrap |
|--------------------|-----------|
| Empty (no catalog artifacts) | MAY initialize |
| Only retired versions | SHALL NOT execute |
| Draft versions present | SHALL NOT execute |
| Published versions present | SHALL NOT execute |

### Runtime anchors

| Artifact | Role |
|----------|------|
| `BOOTSTRAP_01_INFRASTRUCTURE_INITIALIZATION_BOUNDARY` | Program constant |
| `isPersistentCatalogUninitialized()` | Existence predicate (not lifecycle) |
| `bootstrapPersistentCommercialCatalog()` early return `already_initialized` | Enforcement |
| Publish only when `version.state === "draft"` | Defense-in-depth during first init |

### Violation

Violation constitutes an architectural boundary breach between **Infrastructure Initialization** and **Business Lifecycle Governance**.
