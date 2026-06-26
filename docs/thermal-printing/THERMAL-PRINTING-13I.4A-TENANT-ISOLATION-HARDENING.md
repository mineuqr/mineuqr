# THERMAL-PRINTING-13I.4A — Tenant Isolation Hardening

**Status:** Complete  
**Date:** 2026-06-26  
**ADR:** [PRINTING-ADR-13I-005](./PRINTING-ADR-13I-005.md)

---

## Executive Summary

Tenant isolation in the thermal printing pipeline is now enforced by architecture, not convention. A centralized authority module (`tenantOwnershipAuthority.ts`) validates `restaurantId` at every execution boundary. The unsafe `routeViaSingleCandidate` fallback was removed. Assignment, routing, dispatch, fetch, and execution reject cross-restaurant ownership violations. Operator agent visibility derives from restaurant ownership, not profile overlap. Diagnostics retain global agent visibility with ownership-based relevance badges.

---

## Ownership Authority Diagram

```text
Restaurant (restaurantId — DB + job row)
    ↓ assertJobPrinterRestaurantOwnership
Printer (printers.restaurantId)
    ↓ resolvePrinter + assertAgentAuthorizedForRestaurant
Assignment (assignment.restaurantId, assignedAgentId)
    ↓ assertPrintJobOwnershipChain
Dispatch (notify assignedAgentId only after chain validation)
    ↓ JOB_ASSIGNED WebSocket
Fetch (rejectIfPrintJobOwnershipViolated before transport)
    ↓ renderKitchenTicket + transport context
Execution (rejectIfPrintJobOwnershipViolated on outcome report)
    ↓ state transition + telemetry
Telemetry (events scoped by job.restaurantId — unchanged)
```

---

## Enforcement Matrix

| Module | Before | After | Ownership enforced? |
|--------|--------|-------|---------------------|
| `tenantOwnershipAuthority.ts` | — | **NEW** | ✓ Central authority |
| `routingEngine.ts` | CONDITIONALLY SAFE | **HARDENED** | ✓ `restaurantId` required; agent ownership; no single-candidate |
| `assignmentService.ts` | CONDITIONALLY SAFE | **HARDENED** | ✓ Job↔printer + routing chain |
| `dispatchBridgeService.ts` | SAFE | **HARDENED** | ✓ Chain validation before notify |
| `jobRetrievalService.ts` | CONDITIONALLY SAFE | **HARDENED** | ✓ Fetch rejects mismatch |
| `executionOutcomeService.ts` | CONDITIONALLY SAFE | **HARDENED** | ✓ Execution rejects mismatch |
| `printOperationsService.listAgentOverview` | NOT SAFE (UI) | **HARDENED** | ✓ Ownership only |
| `printOperationsDiscoveryService` | CONDITIONALLY SAFE | **HARDENED** | ✓ `relevantToRestaurant` via ownership |
| `printJobTelemetryService` | SAFE | SAFE | ✓ Unchanged |
| `printerResolutionService` | CONDITIONALLY SAFE | CONDITIONALLY SAFE | Routing layer adds restaurant guard |
| Agent registration (HELLO) | CONDITIONALLY SAFE | CONDITIONALLY SAFE | Out of scope; ownership via projection |

### Subsystem verdict summary

| Subsystem | Verdict |
|-----------|---------|
| Central authority | **HARDENED** |
| Assignment | **HARDENED** |
| Routing | **HARDENED** |
| Dispatch | **HARDENED** |
| Fetch | **HARDENED** |
| Execution | **HARDENED** |
| Telemetry | **SAFE** (unchanged) |
| Dashboard operator views | **HARDENED** |
| Diagnostics | **CONDITIONALLY SAFE** (global list intentional) |
| Database | **CONDITIONALLY SAFE** (recommendation documented, no migration) |

---

## Audit Matrix (identifier usage)

| Module | `restaurantId` | `printerId` | `profileId` | `agentId` | Ownership enforced? | Was missing |
|--------|----------------|-------------|-------------|-----------|---------------------|-------------|
| `printTargetSelectionService` | ✓ assert | ✓ lookup | — | — | ✓ (pre-existing) | — |
| `assignmentService` | ✓ validate | ✓ validate | via routing | ✓ validate | ✓ | Job↔printer, agent |
| `routingEngine` | ✓ required | ✓ input | via resolution | ✓ validate | ✓ | restaurantId, agent |
| `printerResolutionService` | — | ✓ | ✓ global | ✓ | Partial (routing guards) | restaurant scope |
| `dispatchBridgeService` | ✓ chain | ✓ chain | — | ✓ chain | ✓ | Chain validation |
| `jobRetrievalService` | ✓ validate | ✓ lookup | — | ✓ validate | ✓ | restaurantId |
| `executionOutcomeService` | ✓ validate | ✓ lookup | — | ✓ validate | ✓ | restaurantId |
| `printOperationsService` | ✓ filter | — | — | ✓ ownership | ✓ | Dashboard filter |
| `printJobTelemetryService` | ✓ read guard | ✓ emit | — | ✓ emit | ✓ (pre-existing) | — |

---

## Database Audit (13I.4A.7)

**Current state:** `printers.profileId` has no uniqueness constraint. `print_jobs.printerId` has no FK to `printers.id`.

**Recommendation:** Add `UNIQUE (restaurantId, profileId)` on `printers` in a future migration phase. This prevents duplicate profile strings within a restaurant while allowing the same string across restaurants (each mapped to distinct `dbPrinterId` rows). Complement with `print_jobs.printerId` FK for durable referential integrity.

**13I.4A action:** No schema change. Runtime assertions provide immediate enforcement.

---

## Tests

`server/printing/tenantIsolationHardening.test.ts` proves:

- Cross-restaurant assignment impossible (printer mismatch)
- Cross-restaurant assignment impossible (profile collision → foreign agent)
- Single-candidate routing cannot violate ownership (removed — fails `UNRESOLVED_PRINTER`)
- Cross-restaurant fetch impossible (assignment restaurant mismatch)
- Cross-restaurant execution impossible (printer restaurant mismatch)
- Profile collision cannot bypass ownership in agent list
- Valid ownership chain assigns successfully

---

## Success Criteria

| Criterion | Met |
|-----------|-----|
| Execution boundaries validate `restaurantId` | ✓ |
| Printer routing requires `printer.restaurantId == job.restaurantId` | ✓ |
| Assignment includes restaurant ownership | ✓ |
| Dispatch rejects mismatched ownership | ✓ |
| Fetch rejects out-of-boundary jobs | ✓ |
| Execution rejects before outcome persistence | ✓ |
| Telemetry remains restaurant scoped | ✓ |
| Dashboard agent visibility from ownership | ✓ |
| Centralized assertions (no duplicated logic) | ✓ |
| Regression tests | ✓ |
| ADR published | ✓ |

---

*Implementation based on THERMAL-PRINTING-13I-NOTE-1 findings.*
