/**
 * ORDER-SETTLEMENT-PERSISTENCE-1 — repository behavior with mocked DB client.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  set: vi.fn(),
  values: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getDb: vi.fn(async () => ({
    insert: mocks.insert,
    select: mocks.select,
    update: mocks.update,
  })),
}));

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import {
  OrderSettlementPersistenceError,
  existsOrderSettlement,
  findOrderSettlementByIdentity,
  insertOrderSettlement,
  listOrderSettlementsForCheck,
  updateOrderSettlement,
} from "../orderSettlementRepository";
import type { OrderSettlement } from "@shared/operational-session";

const settlement: OrderSettlement = {
  restaurantId: 1,
  checkId: 10,
  orderId: 55,
  status: "pending",
  orderTotalSnapshot: "100.00",
  allocatedAmount: "100.00",
  settledAmount: "0.00",
  outstandingAmount: "100.00",
  createdAt: "2026-07-22 10:00:00",
  updatedAt: "2026-07-22 10:00:00",
};

describe("ORDER-SETTLEMENT-PERSISTENCE-1 repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts and returns insertId", async () => {
    mocks.values.mockResolvedValue([{ insertId: 42 }]);
    mocks.insert.mockReturnValue({ values: mocks.values });

    const id = await insertOrderSettlement(settlement);
    expect(id).toBe(42);
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        checkId: 10,
        orderId: 55,
        status: "pending",
      })
    );
  });

  it("maps duplicate key to DUPLICATE persistence error", async () => {
    mocks.values.mockRejectedValue({ code: "ER_DUP_ENTRY", errno: 1062 });
    mocks.insert.mockReturnValue({ values: mocks.values });

    await expect(insertOrderSettlement(settlement)).rejects.toMatchObject({
      code: "DUPLICATE",
    });
  });

  it("loads by identity", async () => {
    mocks.limit.mockResolvedValue([
      {
        id: 1,
        ...settlement,
      },
    ]);
    mocks.where.mockReturnValue({ limit: mocks.limit });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    const found = await findOrderSettlementByIdentity({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    expect(found).toEqual(settlement);
    expect(await existsOrderSettlement({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    })).toBe(true);
  });

  it("lists for check", async () => {
    mocks.where.mockResolvedValue([{ id: 1, ...settlement }]);
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    const list = await listOrderSettlementsForCheck({
      restaurantId: 1,
      checkId: 10,
    });
    expect(list).toHaveLength(1);
    expect(list[0]?.orderId).toBe(55);
  });

  it("update CAS succeeds when expectedStatus matches", async () => {
    mocks.where.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.update.mockReturnValue({ set: mocks.set });

    await expect(
      updateOrderSettlement(
        { ...settlement, status: "settled", settledAmount: "100.00", outstandingAmount: "0.00" },
        { expectedStatus: "pending" }
      )
    ).resolves.toBeUndefined();
  });

  it("update CAS conflicts when status diverged", async () => {
    const updateWhere = vi.fn().mockResolvedValue([{ affectedRows: 0 }]);
    mocks.set.mockReturnValue({ where: updateWhere });
    mocks.update.mockReturnValue({ set: mocks.set });

    mocks.limit.mockResolvedValue([{ id: 1, ...settlement, status: "voided" }]);
    const findWhere = vi.fn().mockReturnValue({ limit: mocks.limit });
    mocks.from.mockReturnValue({ where: findWhere });
    mocks.select.mockReturnValue({ from: mocks.from });

    await expect(
      updateOrderSettlement(
        { ...settlement, status: "settled" },
        { expectedStatus: "pending" }
      )
    ).rejects.toMatchObject({
      name: "OrderSettlementPersistenceError",
      code: "CONFLICT",
    });
  });
});


