# PRINTING-ADR-13I-005 — Tenant Isolation Authority

**Status:** Mandatory  
**Phase:** THERMAL-PRINTING-13I.4A  
**Supersedes:** Implicit profile-overlap tenant boundaries in routing, assignment, fetch, execution, and dashboard agent visibility

---

## Decision

Restaurant (`restaurantId`) is a **first-class runtime authority** across the print pipeline. Every execution boundary validates ownership through `server/printing/tenantOwnershipAuthority.ts`. Profile overlap alone is never sufficient for assignment, fetch, execution, dispatch, or operator agent visibility.

---

## Authority Chain

```text
Restaurant (restaurantId)
  ↓ job.restaurantId
Printer (printer.restaurantId === job.restaurantId)
  ↓ resolvePrinter + agent ownership
Assignment (assignment.restaurantId === job.restaurantId)
  ↓ assignedAgentId
Dispatch (ownership chain re-validated)
  ↓ JOB_ASSIGNED
Fetch (ownership chain re-validated before transport)
  ↓ render + transport context
Execution (ownership chain re-validated on outcome)
  ↓ telemetry (restaurantId from job)
```

---

## Central Module

**File:** `server/printing/tenantOwnershipAuthority.ts`

| Function | Use |
|----------|-----|
| `assertJobPrinterRestaurantOwnership` | Job ↔ printer DB row |
| `assertAgentAuthorizedForRestaurant` | Agent ↔ restaurant (via `resolveRestaurantIdForAgent`) |
| `assertAssignmentJobRestaurantOwnership` | Assignment cache ↔ job |
| `assertPrintJobOwnershipChain` | Full chain (dispatch) |
| `rejectIfPrintJobOwnershipViolated` | Soft reject (fetch / execution) |
| `isAgentOwnedByRestaurant` | Dashboard operator agent list |

**Rule:** Do not duplicate `restaurantId` comparison logic outside this module.

---

## Removed Unsafe Paths

| Path | Action |
|------|--------|
| `routeViaSingleCandidate` | **Removed** — `UNKNOWN_DB_PRINTER` fails closed (`UNRESOLVED_PRINTER`) |
| Profile-overlap agent visibility | **Removed from operator views** — `listAgentOverview` uses ownership only |
| Routing without `restaurantId` | **Rejected** — `resolveRoutingDecision` requires `restaurantId` |

---

## Agent Restaurant Resolution

Agent ownership is resolved via `resolveRestaurantIdForAgent` (convention suffix, HELLO projection cache, endpoint registry). Agents without resolvable restaurant ownership **cannot** receive assignments.

Diagnostics (`getPrintDiscoveryDiagnostics`) may still list global agents but `relevantToRestaurant` is derived from ownership, not profile overlap.

---

## Database Recommendation (13I.4A.7)

**Do not migrate in 13I.4A.** Document for a future phase:

| Option | Recommendation |
|--------|----------------|
| `UNIQUE (restaurantId, profileId)` on `printers` | **Preferred** — allows same logical profile string per restaurant while preventing duplicates within a tenant |
| Global `UNIQUE (profileId)` | Only if profiles are truly deployment-global (not recommended for multi-tenant shared Print Host) |
| FK `print_jobs.printerId → printers.id` | Complementary hardening; enforce job printer exists and inherits ownership |

Runtime authority in 13I.4A does not depend on schema changes; application-layer assertions provide immediate enforcement.

---

## Governance

1. All new print pipeline code must call `tenantOwnershipAuthority` at boundaries.
2. Regression tests live in `tenantIsolationHardening.test.ts`.
3. `resolveRoutingDecision` must receive `restaurantId` from the job row (never inferred from printer alone).

---

## References

- THERMAL-PRINTING-13I-NOTE-1 (investigation)
- THERMAL-PRINTING-13I.4A (implementation)
- PRINTING-ADR-13I-002 (readiness authority — orthogonal)
