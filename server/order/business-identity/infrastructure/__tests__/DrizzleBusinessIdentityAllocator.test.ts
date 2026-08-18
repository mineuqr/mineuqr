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
 * Sequence key includes identity_scope (KIOSK-PRESENTATION-ADOPTION-1).
 */
function createSequenceSimulator(options: { useFixedInsertPattern: boolean }) {
  const state: SequenceState = {
    lastInsertId: 0,
    sequences: new Map(),
  };

  function sequenceKey(restaurantId: number, businessDay: string, identityScope: string) {
    return `${restaurantId}:${businessDay}:${identityScope}`;
  }

  function simulateInsert(
    restaurantId: number,
    businessDay: string,
    identityScope: string
  ) {
    const key = sequenceKey(restaurantId, businessDay, identityScope);
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
    createTx(identityScope: string = "TABLE") {
      let executeCalls = 0;
      const updatedOrders: Array<{
        orderId: number;
        businessDay: string;
        dailyDisplayNumber: number;
        identityScope?: string;
      }> = [];

      const tx = {
        execute: vi.fn(async () => {
          executeCalls += 1;
          if (executeCalls === 1) {
            simulateInsert(720007, "2026-07-10", identityScope);
            return [{ affectedRows: 1 }];
          }
          if (executeCalls === 2) {
            return [[{ n: state.lastInsertId }]];
          }
          throw new Error(`Unexpected execute call #${executeCalls}`);
        }),
        update: vi.fn(() => ({
          set: vi.fn(
            (values: {
              businessDay: string;
              dailyDisplayNumber: number;
              identityScope?: string;
            }) => ({
              where: vi.fn(() => {
                updatedOrders.push({
                  orderId: 0,
                  businessDay: values.businessDay,
                  dailyDisplayNumber: values.dailyDisplayNumber,
                  identityScope: values.identityScope,
                });
              }),
            })
          ),
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
    const { tx } = simulator.createTx("TABLE");
    const allocator = createAllocator();

    const result = await allocator.allocateForNewOrder(tx as never, {
      restaurantId: 720007,
      createdAt: "2026-07-10T19:47:33.000Z",
      workingHours: DEFAULT_HOURS,
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
    });

    expect(result).toEqual({
      businessDay: "2026-07-10",
      dailyDisplayNumber: 1,
      identityScope: "TABLE",
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(simulator.state.sequences.get("720007:2026-07-10:TABLE")).toBe(1);
  });

  it("assigns monotonically increasing numbers on subsequent orders within a scope", async () => {
    const simulator = createSequenceSimulator({ useFixedInsertPattern: true });
    simulator.simulatePriorAutoIncrementInsert(4860001);
    const allocator = createAllocator();

    const { tx: tx1 } = simulator.createTx("TABLE");
    const first = await allocator.allocateForNewOrder(tx1 as never, {
      restaurantId: 720007,
      createdAt: "2026-07-10T19:47:33.000Z",
      workingHours: DEFAULT_HOURS,
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
    });

    simulator.simulatePriorAutoIncrementInsert(4860002);
    const { tx: tx2 } = simulator.createTx("TABLE");
    const second = await allocator.allocateForNewOrder(tx2 as never, {
      restaurantId: 720007,
      createdAt: "2026-07-10T20:00:00.000Z",
      workingHours: DEFAULT_HOURS,
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
    });

    simulator.simulatePriorAutoIncrementInsert(4860003);
    const { tx: tx3 } = simulator.createTx("TABLE");
    const third = await allocator.allocateForNewOrder(tx3 as never, {
      restaurantId: 720007,
      createdAt: "2026-07-10T20:15:00.000Z",
      workingHours: DEFAULT_HOURS,
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
    });

    expect(first.dailyDisplayNumber).toBe(1);
    expect(second.dailyDisplayNumber).toBe(2);
    expect(third.dailyDisplayNumber).toBe(3);
    expect(simulator.state.sequences.get("720007:2026-07-10:TABLE")).toBe(3);
  });

  it("keeps TABLE and KIOSK sequences independent on the same business day", async () => {
    const simulator = createSequenceSimulator({ useFixedInsertPattern: true });
    const allocator = createAllocator();

    simulator.simulatePriorAutoIncrementInsert(1);
    const { tx: tableTx } = simulator.createTx("TABLE");
    const table = await allocator.allocateForNewOrder(tableTx as never, {
      restaurantId: 720007,
      createdAt: "2026-07-10T19:47:33.000Z",
      workingHours: DEFAULT_HOURS,
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
    });

    simulator.simulatePriorAutoIncrementInsert(2);
    const { tx: kioskTx } = simulator.createTx("KIOSK");
    const kiosk = await allocator.allocateForNewOrder(kioskTx as never, {
      restaurantId: 720007,
      createdAt: "2026-07-10T19:50:00.000Z",
      workingHours: DEFAULT_HOURS,
      fulfilmentAnchorType: "station",
      serviceMode: "counter",
    });

    expect(table).toEqual({
      businessDay: "2026-07-10",
      dailyDisplayNumber: 1,
      identityScope: "TABLE",
    });
    expect(kiosk).toEqual({
      businessDay: "2026-07-10",
      dailyDisplayNumber: 1,
      identityScope: "KIOSK",
    });
    expect(simulator.state.sequences.get("720007:2026-07-10:TABLE")).toBe(1);
    expect(simulator.state.sequences.get("720007:2026-07-10:KIOSK")).toBe(1);
  });

  it("keeps POS and WAITER sequences independent of TABLE", async () => {
    const simulator = createSequenceSimulator({ useFixedInsertPattern: true });
    const getWorkingHours = vi.fn(async () => DEFAULT_HOURS);
    const allocator = createAllocator({
      getWorkingHours,
    } as unknown as RestaurantOpeningTimeResolver);

    const { tx: posTx } = simulator.createTx("POS");
    const pos = await allocator.allocateForNewOrder(posTx as never, {
      restaurantId: 720007,
      createdAt: "2026-07-10T19:47:33.000Z",
      workingHours: DEFAULT_HOURS,
      identityScope: "POS",
    });

    const { tx: waiterTx } = simulator.createTx("WAITER");
    const waiter = await allocator.allocateForNewOrder(waiterTx as never, {
      restaurantId: 720007,
      createdAt: "2026-07-10T19:47:33.000Z",
      workingHours: DEFAULT_HOURS,
      identityScope: "WAITER",
    });

    expect(pos).toEqual({
      businessDay: "2026-07-10",
      dailyDisplayNumber: 1,
      identityScope: "POS",
    });
    expect(waiter).toEqual({
      businessDay: "2026-07-10",
      dailyDisplayNumber: 1,
      identityScope: "WAITER",
    });
    expect(getWorkingHours).not.toHaveBeenCalled();
    expect(posTx.update).not.toHaveBeenCalled();
    expect(waiterTx.update).not.toHaveBeenCalled();
  });

  it("uses the provided workingHours for businessDay and does not SELECT hours", async () => {
    const simulator = createSequenceSimulator({ useFixedInsertPattern: true });
    const getWorkingHours = vi.fn(async () => DEFAULT_HOURS);
    const allocator = createAllocator({
      getWorkingHours,
    } as unknown as RestaurantOpeningTimeResolver);

    const lateOpen = resolveNormalizedOpeningHours({
      friday: { open: "23:00", close: "02:00" },
    });
    const { tx, getExecuteCalls } = simulator.createTx("TABLE");
    const result = await allocator.allocateForNewOrder(tx as never, {
      restaurantId: 720007,
      createdAt: "2026-07-10T19:47:33.000Z",
      workingHours: lateOpen,
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
    });

    expect(result.businessDay).toBe("2026-07-09");
    expect(getWorkingHours).not.toHaveBeenCalled();
    expect(getExecuteCalls()).toBe(2);
    expect(tx.update).not.toHaveBeenCalled();
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
