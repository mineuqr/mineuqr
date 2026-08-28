import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { fingerprintOrderCreateSubmission } from "../orderCreateSubmissionFingerprint";
import {
  createPublicOrderCreateIdempotencyPersistHook,
  replayAfterOrderCreateUniqueCollision,
  replayPublicTableOrderCreate,
} from "../publicTableOrderCreateIdempotency";
import {
  OrderCreateIdempotencyUniqueCollisionError,
  isOrderCreateIdempotencyUniqueCollision,
} from "../../infrastructure/persistence/orderCreateIdempotencyStore";

const findOrderCreateIdempotency = vi.hoisted(() => vi.fn());
const getOrderById = vi.hoisted(() => vi.fn());
const getOrderItemsByOrderId = vi.hoisted(() => vi.fn());
const findSessionById = vi.hoisted(() => vi.fn());
const insertOrderCreateIdempotencyInTransaction = vi.hoisted(() => vi.fn());

vi.mock("../../infrastructure/persistence/orderCreateIdempotencyStore", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../infrastructure/persistence/orderCreateIdempotencyStore")
  >();
  return {
    ...actual,
    findOrderCreateIdempotency,
    insertOrderCreateIdempotencyInTransaction,
  };
});

vi.mock("../../../db", () => ({
  getOrderById,
  getOrderItemsByOrderId,
}));

vi.mock("../../../diningSession/sessionRepository", () => ({
  findSessionById,
}));

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

const baseFingerprint = fingerprintOrderCreateSubmission({
  restaurantId: 1,
  tableId: 7,
  tableNumber: 3,
  items: [{ menuItemId: 10, quantity: 1 }],
});

describe("public Table/QR order.create submission fingerprint", () => {
  const base = {
    restaurantId: 1,
    tableId: 7,
    tableNumber: 3,
    customerName: "Ada",
    notes: "no onions",
    items: [
      { menuItemId: 2, quantity: 1, notes: "a", modifiers: ["x", "y"] },
      { menuItemId: 1, quantity: 2, notes: null, modifiers: ["y", "x"] },
    ],
  };

  it("is deterministic across item and modifier order", () => {
    const reversed = {
      ...base,
      items: [
        { menuItemId: 1, quantity: 2, notes: null, modifiers: ["x", "y"] },
        { menuItemId: 2, quantity: 1, notes: "a", modifiers: ["y", "x"] },
      ],
    };
    expect(fingerprintOrderCreateSubmission(base)).toBe(
      fingerprintOrderCreateSubmission(reversed)
    );
  });

  it("ignores client-supplied price fields by omitting them from the canonical payload", () => {
    const withPrice = {
      ...base,
      items: base.items.map((item) => ({ ...item, price: "99.00" })),
    };
    expect(fingerprintOrderCreateSubmission(base)).toBe(
      fingerprintOrderCreateSubmission(withPrice)
    );
  });

  it("changes when items, table, or restaurant change", () => {
    const original = fingerprintOrderCreateSubmission(base);
    expect(
      fingerprintOrderCreateSubmission({ ...base, restaurantId: 2 })
    ).not.toBe(original);
    expect(fingerprintOrderCreateSubmission({ ...base, tableId: 8 })).not.toBe(
      original
    );
    expect(
      fingerprintOrderCreateSubmission({
        ...base,
        items: [{ menuItemId: 1, quantity: 9 }],
      })
    ).not.toBe(original);
  });
});

describe("public Table/QR order.create idempotency replay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the original Order for the same submission fingerprint (lost HTTP / retry)", async () => {
    findOrderCreateIdempotency.mockResolvedValue({
      restaurantId: 1,
      submissionId: "11111111-1111-4111-8111-111111111111",
      fingerprint: baseFingerprint,
      orderId: 55,
    });
    getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      tableId: 7,
      tableNumber: 3,
      sessionId: 10,
      orderNumber: "ORD-0001",
      trackingToken: "tok-original",
      totalAmount: "12.00",
      createdAt: "2026-08-28 12:00:00",
      status: "pending",
      businessDay: "2026-08-28",
      dailyDisplayNumber: 1,
      identityScope: "TABLE",
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
    });
    getOrderItemsByOrderId.mockResolvedValue([
      { quantity: 2 },
      { quantity: 1 },
    ]);

    const replayed = await replayPublicTableOrderCreate({
      restaurantId: 1,
      submissionId: "11111111-1111-4111-8111-111111111111",
      fingerprint: baseFingerprint,
      tableId: 7,
      tableNumber: 3,
    });

    expect(replayed?.orderId).toBe(55);
    expect(replayed?.trackingToken).toBe("tok-original");
    expect(replayed?.itemCount).toBe(3);
    expect(getOrderById).toHaveBeenCalledWith(55);
  });

  it("conflicts when the same submissionId carries a different payload", async () => {
    findOrderCreateIdempotency.mockResolvedValue({
      restaurantId: 1,
      submissionId: "11111111-1111-4111-8111-111111111111",
      fingerprint: baseFingerprint,
      orderId: 55,
    });

    await expect(
      replayPublicTableOrderCreate({
        restaurantId: 1,
        submissionId: "11111111-1111-4111-8111-111111111111",
        fingerprint: "0".repeat(64),
        tableId: 7,
        tableNumber: 3,
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("does not replay another restaurant's mapping", async () => {
    findOrderCreateIdempotency.mockResolvedValue(null);

    const replayed = await replayPublicTableOrderCreate({
      restaurantId: 2,
      submissionId: "11111111-1111-4111-8111-111111111111",
      fingerprint: baseFingerprint,
      tableId: 7,
      tableNumber: 3,
    });

    expect(replayed).toBeNull();
    expect(findOrderCreateIdempotency).toHaveBeenCalledWith({
      restaurantId: 2,
      submissionId: "11111111-1111-4111-8111-111111111111",
    });
    expect(getOrderById).not.toHaveBeenCalled();
  });

  it("conflicts when the same submissionId is reused at a different table", async () => {
    findOrderCreateIdempotency.mockResolvedValue({
      restaurantId: 1,
      submissionId: "11111111-1111-4111-8111-111111111111",
      fingerprint: baseFingerprint,
      orderId: 55,
    });
    getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      tableId: 7,
      tableNumber: 3,
      orderNumber: "ORD-0001",
      trackingToken: "tok-original",
      totalAmount: "12.00",
      createdAt: "2026-08-28 12:00:00",
      status: "pending",
      businessDay: "2026-08-28",
      dailyDisplayNumber: 1,
      identityScope: "TABLE",
    });

    await expect(
      replayPublicTableOrderCreate({
        restaurantId: 1,
        submissionId: "11111111-1111-4111-8111-111111111111",
        fingerprint: baseFingerprint,
        tableId: 9,
        tableNumber: 4,
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("public Table/QR order.create unique collision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("replays the committed winner after a duplicate-key rollback", async () => {
    findOrderCreateIdempotency.mockResolvedValue({
      restaurantId: 1,
      submissionId: "11111111-1111-4111-8111-111111111111",
      fingerprint: baseFingerprint,
      orderId: 55,
    });
    getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      tableId: 7,
      tableNumber: 3,
      orderNumber: "ORD-0001",
      trackingToken: "tok-original",
      totalAmount: "12.00",
      createdAt: "2026-08-28 12:00:00",
      status: "pending",
      businessDay: "2026-08-28",
      dailyDisplayNumber: 1,
      identityScope: "TABLE",
    });
    getOrderItemsByOrderId.mockResolvedValue([{ quantity: 1 }]);

    const replayed = await replayAfterOrderCreateUniqueCollision({
      restaurantId: 1,
      submissionId: "11111111-1111-4111-8111-111111111111",
      fingerprint: baseFingerprint,
      tableId: 7,
      tableNumber: 3,
      error: new OrderCreateIdempotencyUniqueCollisionError(),
    });

    expect(replayed.orderId).toBe(55);
    expect(replayed.trackingToken).toBe("tok-original");
  });

  it("treats only the mapped unique-collision error as replayable", () => {
    expect(
      isOrderCreateIdempotencyUniqueCollision(
        new OrderCreateIdempotencyUniqueCollisionError()
      )
    ).toBe(true);
    expect(
      isOrderCreateIdempotencyUniqueCollision({ code: "ER_DUP_ENTRY", errno: 1062 })
    ).toBe(false);
  });

  it("inserts the mapping in the Order persist transaction hook", async () => {
    insertOrderCreateIdempotencyInTransaction.mockResolvedValue(undefined);
    const hook = createPublicOrderCreateIdempotencyPersistHook({
      restaurantId: 1,
      submissionId: "11111111-1111-4111-8111-111111111111",
      fingerprint: baseFingerprint,
    });
    const tx = { kind: "tx" };
    await hook(tx, {
      order: { id: 55 },
      outboxEventIds: ["evt-1"],
    } as never);

    expect(insertOrderCreateIdempotencyInTransaction).toHaveBeenCalledWith(tx, {
      restaurantId: 1,
      submissionId: "11111111-1111-4111-8111-111111111111",
      fingerprint: baseFingerprint,
      orderId: 55,
    });
  });

  it("does not treat an unrelated TRPC error as a replayable collision", async () => {
    await expect(
      replayAfterOrderCreateUniqueCollision({
        restaurantId: 1,
        submissionId: "11111111-1111-4111-8111-111111111111",
        fingerprint: baseFingerprint,
        tableId: 7,
        tableNumber: 3,
        error: new TRPCError({ code: "BAD_REQUEST", message: "nope" }),
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(findOrderCreateIdempotency).not.toHaveBeenCalled();
  });
});
