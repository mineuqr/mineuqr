# CRMP-OPERATIONS-API-1 — API Audit (Phase 1)

| Field | Value |
|---|---|
| **Program** | CRMP-OPERATIONS-API-1 |
| **Date** | 2026-07-24 |
| **Mode** | Audit only (pre-implementation) |

---

## 1. Router registration

- Root: `server/routers.ts` → `appRouter`
- Pattern: top-level keys mounting domain routers (`multiCheckAllocation`, `settlementRecord`, `operationalDevice`, …)
- **No CRMP / Register Operations key today**

## 2. Auth / scoping

| Helper | Use |
|--------|-----|
| `verifiedProcedure` | Authenticated + email verification gate |
| `assertRestaurantAccess` | Owner or platform admin; restaurantId from input |
| `deviceProcedure` | Operational device session (no register role yet) |

**No** `managerProcedure` / `supervisorProcedure`. User roles are `user` \| `admin`.

## 3. Permission mapping (this program)

| Program role | Enforced as |
|--------------|-------------|
| Manager / Supervisor / Support | Restaurant owner or admin via `assertRestaurantAccess` |
| Settlement Station / Counter | Same dashboard auth until Settlement Station device role exists |
| Unauthorized | `FORBIDDEN` from access assert / unauthenticated |

## 4. Canonical insertion point

`server/crmp/api/crmpRouter.ts` mounted as:

```ts
crmp: crmpRouter
```

Nested: `crmp.register.*` for Register Operations (this program).  
Financial Shift write commands **out of scope** unless needed for Current Financial Shift **read**.

## 5. Template

Mirror `server/operational-session/check/api/multiCheckAllocationRouter.ts`:

- Zod inputs + `verifiedProcedure` + `assertRestaurantAccess`
- `runCrmpRead` / `runCrmpWrite` error wrappers
- Application service → `RegisterDomainService` / `FinancialShiftDomainService`
- DTOs hide events / persistence rows

## 6. STOP check

| Condition | Status |
|-----------|--------|
| Domain redesign required | No |
| Schema changes | No |
| Business logic in API | Avoided — orchestration only |

**Proceed to implementation.**
