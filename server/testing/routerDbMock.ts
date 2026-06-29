/**
 * Shared stubs required when tests import `appRouter` (via `OrderInfrastructureAdapters`).
 *
 * Usage in test files:
 * ```ts
 * vi.mock("./db", () => ({
 *   generateOrderNumber: routerDbMockExports.generateOrderNumber,
 *   getUserById: vi.fn(),
 *   // ...other overrides
 * }));
 * ```
 *
 * Do not use `importOriginal` on `./db` — `db.ts` circularly imports `platformAccount.ts`.
 */
import { vi } from "vitest";

export const routerDbMockExports = {
  generateOrderNumber: vi.fn(async (_restaurantId: number) => "ORD-MOCK-001"),
};

export function createRouterDbMock(overrides: Record<string, unknown>) {
  return {
    ...routerDbMockExports,
    ...overrides,
  };
}
