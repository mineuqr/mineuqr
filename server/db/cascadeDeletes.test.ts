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

const { opsLogMock } = vi.hoisted(() => ({
  opsLogMock: vi.fn(),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

const { PLATFORM_OPEN_ID } = vi.hoisted(() => ({
  PLATFORM_OPEN_ID: "protected_platform_open_id",
}));

vi.mock("../_core/env", () => ({
  ENV: { ownerOpenId: PLATFORM_OPEN_ID },
}));

vi.mock("../db", () => ({
  getDb: vi.fn(async () => ({
    transaction: txMocks.transaction,
  })),
  getUserById: vi.fn(),
}));

import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  assertProtectedUserClassificationModifiable,
  assertProtectedUserPasswordResetAllowed,
  assertProtectedUserRoleModifiable,
  assertProtectedUserSubscriptionModifiable,
  assertUserDeletable,
  deleteSubscriptionCascade,
  ProtectedUserDeleteError,
  ProtectedUserModifyError,
} from "./cascadeDeletes";
import { getDb, getUserById } from "../db";

describe("cascadeDeletes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) =>
      id === 1 ? { id: 1, openId: PLATFORM_OPEN_ID } : { id, openId: `user_${id}` }
    );
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

  it("assertUserDeletable throws for platform account", async () => {
    await expect(assertUserDeletable(1)).rejects.toBeInstanceOf(ProtectedUserDeleteError);
    await expect(assertUserDeletable(5)).resolves.toBeUndefined();
  });

  it("assertProtectedUserRoleModifiable throws for platform account", async () => {
    await expect(assertProtectedUserRoleModifiable(1)).rejects.toBeInstanceOf(
      ProtectedUserModifyError
    );
  });

  it("assertProtectedUserClassificationModifiable throws for platform account", async () => {
    await expect(assertProtectedUserClassificationModifiable(1)).rejects.toBeInstanceOf(
      ProtectedUserModifyError
    );
  });

  it("assertProtectedUserSubscriptionModifiable throws for platform account", async () => {
    await expect(assertProtectedUserSubscriptionModifiable(1)).rejects.toBeInstanceOf(
      ProtectedUserModifyError
    );
    await expect(assertProtectedUserSubscriptionModifiable(5)).resolves.toBeUndefined();
  });

  it("assertProtectedUserPasswordResetAllowed throws for platform account", async () => {
    await expect(assertProtectedUserPasswordResetAllowed(1)).rejects.toBeInstanceOf(
      ProtectedUserModifyError
    );
  });

  it("deleteSubscriptionCascade runs inside a transaction", async () => {
    await deleteSubscriptionCascade(42);
    expect(getDb).toHaveBeenCalled();
    expect(txMocks.transaction).toHaveBeenCalledTimes(1);
    expect(txMocks.delete).toHaveBeenCalled();
  });

  it("deleteSubscriptionCascade includes before snapshot on completed event", async () => {
    await deleteSubscriptionCascade(101, {
      procedure: "admin.deleteUserSubscriptionByAdmin",
      subscriptionBefore: {
        plan: 30002,
        status: "active",
        expiration: "2026-07-01T00:00:00.000Z",
      },
    });

    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.cascade_subscription_deleted,
        metadata: expect.objectContaining({
          phase: "completed",
          subscriptionId: 101,
          before: {
            plan: 30002,
            status: "active",
            expiration: "2026-07-01T00:00:00.000Z",
          },
        }),
      })
    );
  });

  it("deleteSubscriptionCascade does not emit completed event when transaction fails", async () => {
    txMocks.transaction.mockRejectedValueOnce(new Error("tx failed"));

    await expect(
      deleteSubscriptionCascade(101, {
        subscriptionBefore: {
          plan: 30002,
          status: "active",
          expiration: "2026-07-01T00:00:00.000Z",
        },
      })
    ).rejects.toThrow("tx failed");

    const completedEvents = opsLogMock.mock.calls.filter(
      ([entry]) =>
        entry?.type === OPS_EVENT.cascade_subscription_deleted &&
        entry?.metadata?.phase === "completed"
    );
    expect(completedEvents).toHaveLength(0);
  });
});
