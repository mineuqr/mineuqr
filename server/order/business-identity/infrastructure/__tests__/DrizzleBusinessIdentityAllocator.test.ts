import { describe, expect, it, vi, beforeEach } from "vitest";
import { DrizzleBusinessIdentityAllocator } from "../DrizzleBusinessIdentityAllocator";
import type { RestaurantOpeningTimeResolver } from "../RestaurantOpeningTimeResolver";
import { BusinessIdentityMetrics } from "../../observability/BusinessIdentityMetrics";
import { resolveNormalizedOpeningHours } from "../../../../../shared/utils/businessDay";

vi.mock("../../observability/businessIdentityObservability", () => ({
  logBusinessIdentityAssignmentStarted: vi.fn(),
  logBusinessIdentityAssignmentCompleted: vi.fn(),
}));

const DEFAULT_HOURS = resolveNormalizedOpeningHours({});

type SequenceState = {
  lastInsertId: number;
  sequences: Map<string, number>;
};

/**
 * Simulates MySQL/TiDB LAST_INSERT_ID semantics for the hot-path counter pattern.
 * - Plain INSERT with last_number=1 (buggy): does NOT refresh LAST_INSERT_ID().
 * - INSERT with LAST_INSERT_ID(1) (fixed): sets LAST_INSERT_ID() to 1.
 * - ON DUPLICATE KEY UPDATE LAST_INSERT_ID(n+1): sets LAST_INSERT_ID() to n+1.
 */
function createSequenceSimulator(options: { useFixedInsertPattern: boolean }) {
  const state: SequenceState = {
    lastInsertId: 0,
    sequences: new Map(),
  };

  function sequenceKey(restaurantId: number, businessDay: string) {
    return `${restaurantId}:${businessDay}`;
  }

  function simulateInsert(restaurantId: number, businessDay: string) {
    const key = sequenceKey(restaurantId, businessDay);
    const existing = state.sequences.get(key);

    if (existing == null) {
      state.sequences.set(key, 1);
      if (options.useFixedInsertPattern) {
        state.lastInsertId = 1;
      }
      return;
    }

    const next = existing + 1;
    state.sequences.set(key, next);
    state.lastInsertId = next;
  }

  return {
    state,
    simulatePriorAutoIncrementInsert(id: number) {
      state.lastInsertId = id;
    },
    createTx() {
      let executeCalls = 0;
      const updatedOrders: Array<{ orderId: number; businessDay: string; dailyDisplayNumber: number }> =
        [];

      const tx = {
        execute: vi.fn(async () => {
          executeCalls += 1;
          if (executeCalls === 1) {
            simulateInsert(720007, "2026-07-10");
            return [{ affectedRows: 1 }];
          }
          if (executeCalls === 2) {
            return [[{ n: state.lastInsertId }]];
          }
          throw new Error(`Unexpected execute call #${executeCalls}`);
        }),
        update: vi.fn(() => ({
          set: vi.fn((values: { businessDay: string; dailyDisplayNumber: number }) => ({
            where: vi.fn(() => {
              updatedOrders.push({
                orderId: 0,
                businessDay: values.businessDay,
                dailyDisplayNumber: values.dailyDisplayNumber,
              });
            }),
          })),
        })),
      };

      return { tx, updatedOrders, getExecuteCalls: () => executeCalls };
    },
  };
}

function createAllocator(resolver?: RestaurantOpeningTimeResolver) {
  const openingTimeResolver =
    resolver ??
    ({
      getWorkingHours: vi.fn(async () => DEFAULT_HOURS),
    } as unknown as RestaurantOpeningTimeResolver);

  return new DrizzleBusinessIdentityAllocator(openingTimeResolver, new BusinessIdentityMetrics());
}

describe("DrizzleBusinessIdentityAllocator.allocateForNewOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns daily_display_number = 1 on first business day order after stale AUTO_INCREMENT", async () => {
    const simulator = createSequenceSimulator({ useFixedInsertPattern: true });
    simulator.simulatePriorAutoIncrementInsert(4860001);
    const { tx, updatedOrders } = simulator.createTx();
    const allocator = createAllocator();

    const result = await allocator.allocateForNewOrder(tx as never, {
      orderId: 4860001,
      restaurantId: 720007,
      createdAt: "2026-07-10T19:47:33.000Z",
    });

    expect(result).toEqual({ businessDay: "2026-07-10", dailyDisplayNumber: 1 });
    expect(updatedOrders.at(-1)?.dailyDisplayNumber).toBe(1);
    expect(simulator.state.sequences.get("720007:2026-07-10")).toBe(1);
  });

  it("assigns monotonically increasing numbers on subsequent orders", async () => {
    const simulator = createSequenceSimulator({ useFixedInsertPattern: true });
    simulator.simulatePriorAutoIncrementInsert(4860001);
    const allocator = createAllocator();

    const { tx: tx1 } = simulator.createTx();
    const first = await allocator.allocateForNewOrder(tx1 as never, {
      orderId: 4860001,
      restaurantId: 720007,
      createdAt: "2026-07-10T19:47:33.000Z",
    });

    simulator.simulatePriorAutoIncrementInsert(4860002);
    const { tx: tx2 } = simulator.createTx();
    const second = await allocator.allocateForNewOrder(tx2 as never, {
      orderId: 4860002,
      restaurantId: 720007,
      createdAt: "2026-07-10T20:00:00.000Z",
    });

    simulator.simulatePriorAutoIncrementInsert(4860003);
    const { tx: tx3 } = simulator.createTx();
    const third = await allocator.allocateForNewOrder(tx3 as never, {
      orderId: 4860003,
      restaurantId: 720007,
      createdAt: "2026-07-10T20:15:00.000Z",
    });

    expect(first.dailyDisplayNumber).toBe(1);
    expect(second.dailyDisplayNumber).toBe(2);
    expect(third.dailyDisplayNumber).toBe(3);
    expect(simulator.state.sequences.get("720007:2026-07-10")).toBe(3);
  });

  it("regression: plain INSERT value 1 would have leaked stale orderId", () => {
    const simulator = createSequenceSimulator({ useFixedInsertPattern: false });
    simulator.simulatePriorAutoIncrementInsert(4860001);
    simulator.createTx();

    expect(simulator.state.lastInsertId).toBe(4860001);

    const fixed = createSequenceSimulator({ useFixedInsertPattern: true });
    fixed.simulatePriorAutoIncrementInsert(4860001);
    fixed.createTx().tx.execute();
    expect(fixed.state.lastInsertId).toBe(1);
  });
});
