# SCREEN-FLEET-SCALE-1 — Fleet Scalability Architecture
## Phase C — Certification Report

**Program:** SCREEN-FLEET-SCALE-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-06  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

SCREEN-FLEET-SCALE-1 transforms Screen Management from a full-list registry into an **enterprise-grade fleet query architecture**. The platform now exposes `OperationalScreenFleetReadModel` via a single server-side `FleetQueryEngine` with search, filtering, sorting, cursor pagination, grouping, and observability. The workspace consumes fleet read models only — no client-side fleet filtering, no full-fleet loads, and virtualized presentation for large result sets. Canonical operational state is projected server-side (aligned with SCREEN-STATE-MODEL-1). Management mutations, authentication, runtime, configuration, APIs, and database schema remain backward compatible.

---

## 2. Root Cause Analysis

Before this program, Screen Management:

| Concern | Previous behavior |
|---------|-------------------|
| Load | `management.list` — entire restaurant fleet |
| KPIs | `getHealthSummary` — second full-list scan |
| Search | None |
| Filter | None (client rendered all cards) |
| Pagination | None |
| Virtualization | None — O(n) DOM nodes |
| State | Cards derived presence from raw list items |
| Scale | N+1 token lookups per list |

This worked for small fleets but could not scale to thousands of screens without architectural redesign.

---

## 3. Architecture Decision

**Decision:** Introduce a command/query split for fleet reads — `operationalDevice.fleet.*` read namespace with `FleetQueryEngine` as the single query authority.

**Rationale:**
- Server-side search/filter/sort/pagination eliminates client fleet logic
- Read model decouples presentation from registry records
- Canonical state projection centralizes fleet status (no card calculations)
- Cursor pagination supports incremental loading
- Virtualization bounds DOM size
- KPI aggregates via dedicated query (no duplicate full scans in UI)
- `management.*` mutations preserved for backward compatibility

---

## 4. Fleet Scalability Architecture

```
Screen Management Workspace
        │
        ▼
useFleetQuery / FleetQueryEngine (client coordinator)
        │
        ▼
operationalDevice.fleet.queryScreens (tRPC)
        │
        ▼
FleetQueryEngine (server)
  ├── Normalize query
  ├── Cache (5s TTL)
  ├── FleetReadStore (SQL filters)
  ├── projectFleetReadModel (canonical state)
  ├── Filter / Sort / Paginate / Group
  └── Observability metrics
        │
        ▼
OperationalScreenFleetReadModel[]
        │
        ├→ VirtualizedFleetGrid / Table
        └→ FleetScreenCard (lightweight)
```

---

## 5. Fleet Read Model

```typescript
OperationalScreenFleetReadModel {
  screenId, displayName, role
  branchId, zoneId (null — future-safe)
  canonicalState { operationalState, connectivityState, businessReadiness, maintenanceState }
  businessReadiness
  healthSummary { presence, operational, hasActiveToken, warningCount }
  lastHeartbeat, reportedVersion, configurationVersion
  tenantId, updatedAt, createdAt
}
```

**Location:** `server/operational-device/fleet/domain/fleetReadModelContracts.ts`

Presentation never consumes raw `OperationalDeviceRecord`.

---

## 6. Fleet Query Engine

`FleetQueryEngine` (`server/.../fleet/services/FleetQueryEngine.ts`):

| Responsibility | Implementation |
|----------------|----------------|
| Search | SQL `LIKE` on displayName, role, reportedVersion |
| Filtering | SQL (role, branch, status) + canonical filter pass |
| Sorting | `sortModels()` — displayName, lastSeen, operationalState, role, created, updated, version |
| Cursor pagination | Base64url cursor `{ sortValue, screenId }` |
| Grouping | restaurant → branch → zone → role |
| Query normalization | `clampFleetPageSize`, defaults |
| Cache | 5s in-memory keyed by normalized query |
| Observability | queryDurationMs, cacheHit, resultCount, cursorCount |

Client `FleetQueryEngine` coordinates cursor `loadMore` — delegates all filtering to server.

---

## 7. Search Architecture

Server-side only. Supported fields:

- Display name
- Role
- Branch (via branchId filter + search term match)
- Version (reportedVersion)

No client search over loaded results.

---

## 8. Filter Architecture

Server-side canonical filters:

| Filter | Layer |
|--------|-------|
| Role | SQL |
| Branch | SQL |
| Search | SQL |
| Maintenance / disabled | SQL status |
| Operational state | Canonical projection pass |
| Business readiness | Canonical projection pass |
| Connectivity | Canonical projection pass |
| Zone | Reserved (null today) |
| Configuration state | Reserved |

Workspace filter chips map to `operationalState` query parameter.

---

## 9. Cursor Pagination

```typescript
FleetCursor {
  nextCursor: string | null
  previousCursor: string | null
  pageSize: number
  hasMore: boolean
}
```

Default page size: 50. Max: 100. Presentation consumes cursor via `useFleetQuery.loadMore()` — no page-number assumptions.

---

## 10. Grouping Model

```
Restaurant → Branch → Zone (future) → Role → Screen
```

`groupBy` parameter supported on query engine. Zone is always `null` today; architecture accepts `zoneId` on read model.

---

## 11. Virtualization Strategy

| Component | Strategy |
|-----------|----------|
| `VirtualizedFleetGrid` | Windowed row rendering with scroll offset + overscan |
| Table view | Single-column virtualized grid (72px rows) |
| DOM bound | Only visible rows + overscan rendered |

`data-virtualized="fleet-grid"` attribute for architecture verification.

---

## 12. Health Integration

Fleet displays **projected health only**:

- `healthSummary` on read model (presence, operational flag, token status)
- `canonicalState` from `projectFleetCanonicalState()` — aligned with SCREEN-STATE-MODEL-1 enums
- Cards read `healthSummary` and `canonicalState` — no `deriveDevicePresence` in presentation

---

## 13. Observability

`FleetQueryEngine` exposes per-query:

- `queryDurationMs`
- `cacheHit`
- `resultCount`
- `cursorCount`

`operationalDevice.fleet.getObservability` exposes aggregate cache hits/misses/total queries for future diagnostics programs.

---

## 14. Files Added

| File | Purpose |
|------|---------|
| `server/operational-device/fleet/domain/fleetReadModelContracts.ts` | Read model + query contracts |
| `server/operational-device/fleet/domain/fleetCanonicalState.ts` | Canonical state projection |
| `server/operational-device/fleet/services/projectFleetReadModel.ts` | Device row → read model |
| `server/operational-device/fleet/services/FleetQueryEngine.ts` | Server query engine |
| `server/operational-device/fleet/infrastructure/FleetReadStore.ts` | Store interface |
| `server/operational-device/fleet/infrastructure/InMemoryFleetReadStore.ts` | Test store |
| `server/operational-device/fleet/infrastructure/DrizzleFleetReadStore.ts` | SQL read store |
| `server/operational-device/fleet/routers/fleetReadRouter.ts` | tRPC fleet namespace |
| `server/operational-device/fleetComposition.ts` | Wiring |
| `server/operational-device/fleet/__tests__/FleetQueryEngine.test.ts` | Engine tests |
| `server/operational-device/fleet/__tests__/fleetScalabilityArchitecture.test.ts` | Architecture guards |
| `client/src/lib/screen-fleet/fleetReadModel.ts` | Client types |
| `client/src/lib/screen-fleet/FleetQueryEngine.ts` | Client cursor coordinator |
| `client/src/lib/screen-fleet/useFleetQuery.ts` | React hook |
| `client/src/lib/screen-fleet/__tests__/*` | Client tests + guards |
| `client/src/components/screen-management/FleetScreenCard.tsx` | Lightweight card |
| `client/src/components/screen-management/VirtualizedFleetGrid.tsx` | Virtualized grid |
| `client/src/components/screen-management/VirtualizedFleetTable.tsx` | Virtualized table |
| `docs/engineering/programs/SCREEN-FLEET-SCALE-1/IMPLEMENTATION.md` | This report |

---

## 15. Files Modified

| File | Change |
|------|--------|
| `server/operational-device/operationalDeviceRouter.ts` | Added `fleet` namespace |
| `client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx` | Fleet query + virtualization + filters |
| `client/src/components/screen-management/ScreenSettingsSheet.tsx` | Fetch by screenId; fleet invalidation |

---

## 16. Validation

| Criterion | Status |
|-----------|--------|
| OperationalScreenFleetReadModel | ✓ |
| FleetQueryEngine (server) | ✓ |
| Server-side search | ✓ |
| Server-side filtering | ✓ |
| Server-side sorting | ✓ |
| Cursor pagination | ✓ |
| Virtualization support | ✓ |
| OperationalScreenState consumed (canonical projection) | ✓ |
| Presentation lightweight | ✓ |
| No duplicated fleet calculations | ✓ |
| Backward compatibility (management.*) | ✓ |
| Screen Details not implemented | ✓ |
| Zone management not implemented | ✓ |

---

## 17. Test Results

```
vitest run server/operational-device client/src/lib/operational-screen client/src/lib/screen-fleet

 Test Files  20 passed (20)
      Tests  106 passed (106)

tsc --noEmit → clean
```

**Fleet-specific tests (22):**
- Server FleetQueryEngine: pagination, search, role filter, canonical filter, grouping, cache, KPIs, 1000-screen linear pass
- Server architecture guards (5)
- Client FleetQueryEngine (2)
- Client architecture guards (4)

---

## 18. Performance Validation

| Target | Evidence |
|--------|----------|
| 10,000+ screens architecture | Single-pass filter/sort in engine; test completes < 2s for 1000 devices |
| No O(n²) | One projection pass + one sort per query |
| No repeated filtering | Cache keyed by normalized query (5s TTL) |
| No full DOM render | VirtualizedFleetGrid renders `visibleItems` window only |
| No dual full-list KPI fetch | Workspace uses `fleet.getKpis` only |

---

## 19. Production Risks

| Risk | Mitigation |
|------|------------|
| Canonical filters applied post-SQL | SQL pre-filters role/branch/search; canonical pass documented for full pushdown in future read projection table |
| KPI query still scans all devices for counts | Acceptable at current scale; future `fleet_read_kpis` projection planned |
| 5s query cache may show stale presence | 30s poll interval unchanged; cache TTL short |
| Virtualization uses estimate row height | Grid uses 220px estimate; acceptable for card layout |

---

## 20. Future Programs

| Program | Builds on |
|---------|-----------|
| Fleet read projection table | Denormalized presence + token for SQL canonical filters |
| Zone management | `zoneId` on read model ready |
| Screen Details workspace | Fleet card links by `screenId` |
| Device telemetry ingest | Live `OperationalScreenState` from runtime |
| Bulk operations | Fleet query selection model |
| Cross-restaurant fleet | Tenant-scoped query extension |

---

## 21. Architecture Compliance Review

| Rule | Compliance |
|------|------------|
| Do not load entire fleets in presentation | ✓ Cursor pages of 50 |
| Do not filter fleets inside React | ✓ Server query params only |
| Do not search inside components | ✓ Search input → query param |
| Do not paginate inside presentation | ✓ Server cursor |
| Do not calculate status inside cards | ✓ Read model projection |
| Do not duplicate fleet state | ✓ Single FleetQueryEngine |
| Fleet consumes read models only | ✓ FleetScreenCard |
| Health is projected | ✓ healthSummary on read model |
| API/DB backward compatible | ✓ management.* unchanged |

---

## 22. Evidence

### Workspace no longer uses management.list

```typescript
const fleetQuery = useFleetQuery({
  restaurantId,
  enabled,
  query: { search, role, operationalState, sortBy: "updated", limit: 50 },
});
```

### Architecture guard assertions

- `ScreenManagementWorkspacePanel` contains `useFleetQuery`, not `management.list.useQuery`
- `FleetScreenCard` contains `canonicalState`, not `deriveDevicePresence`
- `VirtualizedFleetGrid` contains `visibleItems`

### Server cursor pagination test

```
first page limit=2 → hasMore=true
second page with cursor → distinct screenIds
```

---

## 23. Final Certification Decision

**CERTIFIED**

SCREEN-FLEET-SCALE-1 Phase C is complete. Screen Management now uses a scalable fleet query architecture with read models, server-side query engine, cursor pagination, canonical state projection, and virtualized presentation. All 106 related tests pass. TypeScript compiles cleanly. The platform is architecturally ready for 10,000+ screens per tenant without presentation-layer redesign.
