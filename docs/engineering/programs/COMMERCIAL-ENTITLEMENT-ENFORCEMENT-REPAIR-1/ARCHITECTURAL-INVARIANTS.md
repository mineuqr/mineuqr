# ARCHITECTURAL-INVARIANTS.md

| ID | Invariant | Status |
|----|-----------|--------|
| I-EE-01 | Commercial entitlement is enforced server-side | Held — `requireFeature("devices")` before persist |
| I-EE-02 | Restaurant/RBAC does not imply commercial entitlement | Held — both layers, in order |
| I-EE-03 | Live Plan is the source of current commercial capabilities | Held — hub unchanged |
| I-EE-04 | No capability-specific bypass matrix | Held |
| I-EE-05 | FULL_PLATFORM remains unrestricted by commercial plan limits | Held — hub all-features |
| I-EE-06 | SIMULATED_PLAN uses the selected current Live Plan | Held — owner resolver unchanged |
| I-EE-07 | Failed entitlement resolution fails closed | Held — adapter maps errors to FORBIDDEN |
| I-EE-08 | UI gating is presentation only; API is authoritative | Held |
| I-EE-09 | Owner-specific bypasses prohibited outside centralized resolution | Held |
| I-EE-10 | Enforcement must not modify billing state | Held — code only |
