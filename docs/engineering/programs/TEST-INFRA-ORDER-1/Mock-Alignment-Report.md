# TEST-INFRA-ORDER-1 — Mock Alignment Report

**Program:** TEST-INFRA-ORDER-1  
**Date:** 2026-06-29

---

## Production Contract

| Export | Module | Required by |
|--------|--------|-------------|
| `generateOrderNumber(restaurantId: number): Promise<string>` | `server/db.ts` | `OrderInfrastructureAdapters.orderNumberAdapter` |

Added to ORDER domain via `placeOrderComposition.ts`, loaded when `appRouter` is imported in tests.

---

## Alignment Strategy

**Do:** Add explicit stub for `generateOrderNumber` in partial `db` mocks used by router tests.

**Do not:** Use `vi.importActual("./db")` / `importOriginal` in router-test mocks — breaks `platformAccount` / `cascadeDeletes` isolation due to `db.ts` ↔ `platformAccount.ts` circular import.

---

## Shared Utility

`server/testing/routerDbMock.ts`:

```typescript
export const routerDbMockExports = {
  generateOrderNumber: vi.fn(async (_restaurantId: number) => "ORD-MOCK-001"),
};

export function createRouterDbMock(overrides: Record<string, unknown>) {
  return { ...routerDbMockExports, ...overrides };
}
```

New router-importing tests may use either inline stub or `createRouterDbMock()`.

---

## Files Aligned (21)

| File | Mock path |
|------|-----------|
| `server/admin-audit-fix2.test.ts` | `./db` |
| `server/admin-auth-1b.test.ts` | `./db` |
| `server/admin-auth-1d.test.ts` | `./db` |
| `server/admin-auth-1e.test.ts` | `./db` |
| `server/admin-invoice-billing.test.ts` | `./db` |
| `server/admin-subscription.test.ts` | `./db` |
| `server/passwordResetAudit.test.ts` | `./db` |
| `server/payment-flow.test.ts` | `./db` |
| `server/restaurant-profile-verification.test.ts` | `./db` |
| `server/roleChangeAudit.test.ts` | `./db` |
| `server/routers.test.ts` | `./db` |
| `server/session-owner-workspace.test.ts` | `./db` |
| `server/session-public-recovery.test.ts` | `./db` |
| `server/subscription-invoice-verification.test.ts` | `./db` |
| `server/subscription.test.ts` | `./db` |
| `server/commercial/adminAuth1c.test.ts` | `../db` |
| `server/commercial/authorityCleanup1.test.ts` | `../db` |
| `server/commercial/exec3DashboardApi.test.ts` | `../db` |
| `server/commercial/exec7c2CommercialOverview.test.ts` | `../db` |
| `server/commercial/reporting/analyticsAlignment.test.ts` | `../../db` |
| `server/commercial/reporting/CommercialReportService.test.ts` | `../../db` |

---

## Already-Aligned Files (pre-existing)

Order router tests already included `generateOrderNumber` in their `db` mocks:

- `server/order-router-cleanup.test.ts`
- `server/order-create-*.test.ts`
- `server/order-update-status-*.test.ts`
- `server/order-get-public-status.test.ts`
- `server/phase-c-verification.test.ts`

Tests using `importOriginal` / `vi.importActual` for `db` (e.g. `offers.test.ts`, `identity-integrity.test.ts`) inherit `generateOrderNumber` automatically.

---

## Maintenance Script

`node scripts/align-db-mocks.mjs` — inserts `generateOrderNumber` stub into the 21-file set if missing (idempotent).
