import { beforeEach, describe, expect, it, vi } from "vitest";

const txMocks = vi.hoisted(() => {
  const deleteChain = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  return {
    delete: vi.fn(() => deleteChain),
    select: vi.fn(),
    transaction: vi.fn(),
    deleteChain,
  };
});

vi.mock("../db", () => ({
  getDb: vi.fn(async () => ({
    transaction: txMocks.transaction,
  })),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import {
  assertUserDeletable,
  deleteSubscriptionCascade,
  ProtectedUserDeleteError,
  PROTECTED_USER_IDS,
} from "./cascadeDeletes";
import { getDb } from "../db";

describe("cascadeDeletes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        delete: txMocks.delete,
        select: txMocks.select,
      };
      await fn(tx);
    });
    txMocks.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
  });

  it("PROTECTED_USER_IDS includes admin id 1", () => {
    expect(PROTECTED_USER_IDS).toContain(1);
  });

  it("assertUserDeletable throws for protected user", () => {
    expect(() => assertUserDeletable(1)).toThrow(ProtectedUserDeleteError);
  });

  it("deleteSubscriptionCascade runs inside a transaction", async () => {
    await deleteSubscriptionCascade(42);
    expect(getDb).toHaveBeenCalled();
    expect(txMocks.transaction).toHaveBeenCalledTimes(1);
    expect(txMocks.delete).toHaveBeenCalled();
  });
});
