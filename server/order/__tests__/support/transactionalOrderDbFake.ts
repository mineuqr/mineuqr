/**
 * ORDER-CREATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1 +
 * ORDER-LIFECYCLE-ATOMICITY-AND-SESSION-CONSISTENCY-HARDENING-1 — test support
 * (not a test file).
 *
 * Order create and Order update are both transaction-only: the Order rows and
 * their required Outbox events commit together or nothing commits. Router-level
 * `order.create` / `order.updateStatus` tests must therefore supply a
 * transaction-capable `getDb`, and assert on the rows staged inside that
 * transaction rather than on the removed non-transactional helpers.
 */
import { orderDomainOutbox, orderItems, orders } from "../../../../drizzle/schema";

export type TransactionalOrderDbFake = {
  /** Drop-in `getDb` for `vi.mock("./db", ...)` factories. */
  getDb: () => Promise<unknown>;
  inserted: {
    orders: Record<string, unknown>[];
    orderItems: Record<string, unknown>[];
    outbox: Record<string, unknown>[];
  };
  /** `UPDATE orders SET ...` payloads staged inside the transaction. */
  orderUpdates: Record<string, unknown>[];
  /** The single row staged into `orders`, for create assertions. */
  orderRow: () => Record<string, unknown> | undefined;
  reset: () => void;
};

export function createTransactionalOrderDbFake(options?: {
  insertId?: number;
  restaurant?: { id?: number; userId?: number; workingHours?: unknown };
  /** Row returned by `SELECT ... FROM orders` on the update path. */
  existingOrderRow?: Record<string, unknown>;
}): TransactionalOrderDbFake {
  const insertId = options?.insertId ?? 42;
  const restaurant = {
    id: options?.restaurant?.id ?? 1,
    userId: options?.restaurant?.userId ?? 10,
    workingHours: options?.restaurant?.workingHours ?? null,
  };

  const inserted: TransactionalOrderDbFake["inserted"] = {
    orders: [],
    orderItems: [],
    outbox: [],
  };
  const orderUpdates: Record<string, unknown>[] = [];

  // One shape serves both readers: `restaurants ... FOR UPDATE` reads
  // id/userId/workingHours, and the business-identity allocator reads `n`.
  const executeResult = [
    [{ id: restaurant.id, userId: restaurant.userId, workingHours: restaurant.workingHours, n: 1 }],
  ];

  const tx = {
    execute: async () => executeResult,
    insert: (table: unknown) => ({
      values: async (values: unknown) => {
        const rows = (Array.isArray(values) ? values : [values]) as Record<
          string,
          unknown
        >[];
        if (table === orders) {
          inserted.orders.push(...rows);
          return [{ insertId }];
        }
        if (table === orderItems) {
          inserted.orderItems.push(...rows);
          return undefined;
        }
        if (table === orderDomainOutbox) {
          inserted.outbox.push(...rows);
          return undefined;
        }
        return undefined;
      },
    }),
    select: (_projection?: unknown) => ({
      from: (table: unknown) => {
        const resolve = () => {
          if (table === orderDomainOutbox) return [{ maxSeq: 0 }];
          if (table === orders && options?.existingOrderRow) {
            return [options.existingOrderRow];
          }
          return [];
        };
        // Awaitable at any point in the chain, mirroring a Drizzle query builder.
        const chain = {
          where: () => chain,
          orderBy: () => chain,
          limit: () => chain,
          innerJoin: () => chain,
          leftJoin: () => chain,
          groupBy: () => chain,
          for: () => chain,
          then: (
            onFulfilled?: (value: Record<string, unknown>[]) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) => Promise.resolve(resolve()).then(onFulfilled, onRejected),
        };
        return chain;
      },
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: async () => {
          if (table === orders) {
            orderUpdates.push(values as Record<string, unknown>);
          }
        },
      }),
    }),
  };

  return {
    // Reads outside a transaction (guards, lookups) share the tx query shape.
    getDb: async () => ({
      ...tx,
      transaction: async (fn: (handle: unknown) => Promise<unknown>) => fn(tx),
    }),
    inserted,
    orderUpdates,
    orderRow: () => inserted.orders[0],
    reset: () => {
      inserted.orders.length = 0;
      inserted.orderItems.length = 0;
      inserted.outbox.length = 0;
      orderUpdates.length = 0;
    },
  };
}
