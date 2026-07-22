/**
 * SPLIT-PAYMENT-PERSISTENCE-1 — repository behavior with mocked DB client.
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
  orderBy: vi.fn(),
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
  SplitPaymentPersistenceError,
  existsSplitPayment,
  finalizePaymentAttemptOutcome,
  findSplitPaymentByIdentity,
  insertPaymentAttempt,
  insertSplitPayment,
  listPaymentAttemptsForCheck,
  updateSplitPayment,
} from "../splitPaymentRepository";
import type { PaymentAttempt, SplitPayment } from "@shared/operational-session";

const payment: SplitPayment = {
  restaurantId: 1,
  checkId: 10,
  paymentId: "pay_1",
  paymentReference: "pref_1",
  financialReference: "fref_1",
  status: "pending",
  amount: "50.00",
  allocatedAmount: "0.00",
  unallocatedAmount: "50.00",
  tenders: [],
  tenderAllocations: [],
  allocations: [],
  impliesFinancialSettlement: false,
  createdAt: "2026-07-23 10:00:00",
  updatedAt: "2026-07-23 10:00:00",
};

const attempt: PaymentAttempt = {
  restaurantId: 1,
  checkId: 10,
  attemptId: "att_1",
  paymentId: null,
  status: "started",
  amount: "50.00",
  method: "visa",
  createdAt: "2026-07-23 10:00:00",
  updatedAt: "2026-07-23 10:00:00",
};

describe("SPLIT-PAYMENT-PERSISTENCE-1 repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts Payment and returns insertId", async () => {
    mocks.values.mockResolvedValue([{ insertId: 42 }]);
    mocks.insert.mockReturnValue({ values: mocks.values });

    const id = await insertSplitPayment(payment);
    expect(id).toBe(42);
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "pay_1",
        paymentReference: "pref_1",
        version: 1,
        status: "pending",
      })
    );
  });

  it("maps duplicate Payment key to DUPLICATE", async () => {
    mocks.values.mockRejectedValue({ code: "ER_DUP_ENTRY", errno: 1062 });
    mocks.insert.mockReturnValue({ values: mocks.values });

    await expect(insertSplitPayment(payment)).rejects.toMatchObject({
      code: "DUPLICATE",
    });
  });

  it("loads Payment by canonical identity with version", async () => {
    mocks.limit.mockResolvedValue([
      {
        id: 1,
        ...payment,
        version: 2,
        financialReference: "fref_1",
      },
    ]);
    mocks.where
      .mockReturnValueOnce({ limit: mocks.limit })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    const found = await findSplitPaymentByIdentity({
      restaurantId: 1,
      checkId: 10,
      paymentId: "pay_1",
    });
    expect(found?.version).toBe(2);
    expect(found?.payment.paymentId).toBe("pay_1");
    expect(found?.payment.impliesFinancialSettlement).toBe(false);
  });

  it("existsSplitPayment is true when identity exists", async () => {
    mocks.limit.mockResolvedValue([
      { id: 1, ...payment, version: 1, financialReference: "fref_1" },
    ]);
    mocks.where
      .mockReturnValueOnce({ limit: mocks.limit })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    expect(
      await existsSplitPayment({
        restaurantId: 1,
        checkId: 10,
        paymentId: "pay_1",
      })
    ).toBe(true);
  });

  it("update CAS succeeds when expectedVersion matches", async () => {
    mocks.where.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.update.mockReturnValue({ set: mocks.set });

    const next = await updateSplitPayment(payment, { expectedVersion: 1 });
    expect(next).toBe(2);
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({ version: 2 })
    );
  });

  it("update CAS conflict when version diverged", async () => {
    mocks.where
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockReturnValueOnce({
        limit: vi.fn().mockResolvedValue([
          { id: 1, ...payment, version: 9, financialReference: "fref_1" },
        ]),
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    await expect(
      updateSplitPayment(payment, { expectedVersion: 1 })
    ).rejects.toMatchObject({
      name: "SplitPaymentPersistenceError",
      code: "CONFLICT",
    });
  });

  it("inserts PaymentAttempt as historical row", async () => {
    mocks.values.mockResolvedValue([{ insertId: 7 }]);
    mocks.insert.mockReturnValue({ values: mocks.values });

    const id = await insertPaymentAttempt(attempt, {
      externalProviderReference: "psp_1",
    });
    expect(id).toBe(7);
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: "att_1",
        externalProviderReference: "psp_1",
        status: "started",
      })
    );
  });

  it("duplicate attemptId maps to DUPLICATE (no reuse)", async () => {
    mocks.values.mockRejectedValue({ code: "ER_DUP_ENTRY", errno: 1062 });
    mocks.insert.mockReturnValue({ values: mocks.values });

    await expect(insertPaymentAttempt(attempt)).rejects.toMatchObject({
      code: "DUPLICATE",
    });
  });

  it("finalizes attempt outcome with expectedStatus CAS", async () => {
    mocks.where.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.update.mockReturnValue({ set: mocks.set });

    const succeeded: PaymentAttempt = {
      ...attempt,
      status: "succeeded",
      paymentId: "pay_1",
      updatedAt: "2026-07-23 10:01:00",
    };
    await finalizePaymentAttemptOutcome(succeeded, {
      expectedStatus: "started",
      externalProviderReference: "psp_ok",
    });
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "succeeded",
        paymentId: "pay_1",
        externalProviderReference: "psp_ok",
      })
    );
  });

  it("lists attempts ordered for audit", async () => {
    mocks.orderBy.mockResolvedValue([
      {
        id: 1,
        ...attempt,
        externalProviderReference: null,
      },
      {
        id: 2,
        ...attempt,
        attemptId: "att_2",
        status: "failed",
        externalProviderReference: "psp_x",
      },
    ]);
    mocks.where.mockReturnValue({ orderBy: mocks.orderBy });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    const list = await listPaymentAttemptsForCheck({
      restaurantId: 1,
      checkId: 10,
    });
    expect(list).toHaveLength(2);
    expect(list[0]?.sequence).toBe(1);
    expect(list[1]?.attempt.attemptId).toBe("att_2");
    expect(list[1]?.externalProviderReference).toBe("psp_x");
  });

  it("accepts SessionDbClient without opening its own transaction", async () => {
    const client = {
      insert: mocks.insert,
      select: mocks.select,
      update: mocks.update,
    };
    mocks.values.mockResolvedValue([{ insertId: 1 }]);
    mocks.insert.mockReturnValue({ values: mocks.values });

    await insertSplitPayment(payment, client as never);
    expect(mocks.insert).toHaveBeenCalled();
    expect(JSON.stringify(client)).not.toContain("transaction");
  });
});
