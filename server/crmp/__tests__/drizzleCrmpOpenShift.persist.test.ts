/**
 * Drizzle Financial Shift create — no header ODKU, same-tx allocate+insert.
 */
import { describe, expect, it, vi } from "vitest";
import { CrmpConflictError } from "@shared/crmp";
import {
  crmpDrawerMovements,
  crmpFinancialShifts,
} from "../../../drizzle/schema";
import { createDrizzleCrmpUnitOfWork } from "../DrizzleCrmpRepository";
import { isMysqlDuplicateKeyError } from "../crmpMysqlErrors";

function thenableSelect(rows: unknown[]) {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: async () => rows,
    then(
      onFulfilled?: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) {
      return Promise.resolve(rows).then(onFulfilled, onRejected);
    },
  };
  return chain;
}

function duplicateError() {
  return Object.assign(new Error("Duplicate entry '1' for key 'crmp_financial_shifts_register_shift_number_unique'"), {
    errno: 1062,
    code: "ER_DUP_ENTRY",
  });
}

describe("isMysqlDuplicateKeyError", () => {
  it("detects ER_DUP_ENTRY / 1062", () => {
    expect(isMysqlDuplicateKeyError(duplicateError())).toBe(true);
    expect(isMysqlDuplicateKeyError(new Error("nope"))).toBe(false);
  });
});

describe("createDrizzleCrmpUnitOfWork commitOpenShift", () => {
  it("allocates, inserts without ODKU, and keeps identity on the same tx", async () => {
    const txSeen: unknown[] = [];
    const inserted: unknown[] = [];
    const allocated = 2;
    const tx = {
      execute: vi.fn(async () => [{ n: allocated }]),
      select: vi.fn((shape: Record<string, unknown>) => {
        if (shape && "n" in shape) return thenableSelect([{ n: 1 }]);
        return thenableSelect([
          {
            financialShiftId: "fsh_new",
            shiftNumber: allocated,
            status: "open",
          },
        ]);
      }),
      insert: vi.fn(() => {
        const builder: {
          values: (vals: unknown) => Promise<void>;
          onDuplicateKeyUpdate?: unknown;
        } = {
          values: async (vals: unknown) => {
            inserted.push(vals);
          },
        };
        return builder;
      }),
      delete: vi.fn(() => ({ where: async () => undefined })),
      update: vi.fn(),
    };
    const db = {
      transaction: async (fn: (txClient: typeof tx) => Promise<unknown>) => {
        txSeen.push(tx);
        return fn(tx);
      },
    };
    const uow = createDrizzleCrmpUnitOfWork(async () => db as never);
    const shift = await uow.commitOpenShift({
      restaurantId: 1,
      registerId: "reg_1",
      createShift: (shiftNumber) => ({
        financialShiftId: "fsh_new",
        shiftNumber,
        restaurantId: 1,
        registerId: "reg_1",
        operatorUserId: 10,
        status: "open",
        openingFloatAmount: "0.00",
        currencyCode: "SAR",
        drawer: {
          drawerId: "drw_1",
          currencyCode: "SAR",
          movements: [
            {
              movementId: "mov_1",
              movementType: "opening_float",
              amount: "0.00",
              currencyCode: "SAR",
              reason: "opening_float",
              actorUserId: 10,
              recordedAt: "t0",
            },
          ],
          counts: [],
        },
        handover: null,
        attributions: [],
        version: 1,
        openedAt: "t0",
        closedAt: null,
        closeReason: null,
        archivedAt: null,
        updatedAt: "t0",
      }),
    });
    expect(shift.financialShiftId).toBe("fsh_new");
    expect(shift.shiftNumber).toBe(allocated);
    expect(txSeen).toHaveLength(1);
    expect(tx.execute).toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    const header = inserted.find(
      (row) =>
        row &&
        typeof row === "object" &&
        "financialShiftId" in row &&
        (row as { financialShiftId: string }).financialShiftId === "fsh_new"
    ) as { financialShiftId: string; shiftNumber: number } | undefined;
    expect(header?.financialShiftId).toBe("fsh_new");
    expect(header?.shiftNumber).toBe(allocated);
    const children = inserted.find((row) => Array.isArray(row)) as
      | Array<{ financialShiftId: string }>
      | undefined;
    expect(children?.[0]?.financialShiftId).toBe("fsh_new");
  });

  it("maps unique shift-number collision to CONFLICT and does not update the existing row", async () => {
    const tx = {
      execute: vi.fn(async () => [{ n: 1 }]),
      select: vi.fn((shape: Record<string, unknown>) => {
        if (shape && "n" in shape) return thenableSelect([{ n: 1 }]);
        return thenableSelect([]);
      }),
      insert: vi.fn((table: unknown) => ({
        values: async () => {
          if (table === crmpFinancialShifts) throw duplicateError();
        },
      })),
      delete: vi.fn(() => ({ where: async () => undefined })),
      update: vi.fn(),
    };
    const db = {
      transaction: async (fn: (txClient: typeof tx) => Promise<unknown>) =>
        fn(tx),
    };
    const uow = createDrizzleCrmpUnitOfWork(async () => db as never);
    await expect(
      uow.commitOpenShift({
        restaurantId: 1,
        registerId: "reg_1",
        createShift: (shiftNumber) => ({
          financialShiftId: "fsh_new",
          shiftNumber,
          restaurantId: 1,
          registerId: "reg_1",
          operatorUserId: 10,
          status: "open",
          openingFloatAmount: "0.00",
          currencyCode: "SAR",
          drawer: {
            drawerId: "drw_1",
            currencyCode: "SAR",
            movements: [],
            counts: [],
          },
          handover: null,
          attributions: [],
          version: 1,
          openedAt: "t0",
          closedAt: null,
          closeReason: null,
          archivedAt: null,
          updatedAt: "t0",
        }),
      })
    ).rejects.toBeInstanceOf(CrmpConflictError);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("rolls back when child persist fails after header insert begins", async () => {
    let rolledBack = false;
    const tx = {
      execute: vi.fn(async () => [{ n: 2 }]),
      select: vi.fn((shape: Record<string, unknown>) => {
        if (shape && "n" in shape) return thenableSelect([{ n: 1 }]);
        return thenableSelect([
          { financialShiftId: "fsh_new", shiftNumber: 2, status: "open" },
        ]);
      }),
      insert: vi.fn((table: unknown) => ({
        values: async () => {
          if (table === crmpDrawerMovements) {
            throw new Error("child persist failed");
          }
        },
      })),
      delete: vi.fn(() => ({ where: async () => undefined })),
      update: vi.fn(),
    };
    const db = {
      transaction: async (fn: (txClient: typeof tx) => Promise<unknown>) => {
        try {
          return await fn(tx);
        } catch (error) {
          rolledBack = true;
          throw error;
        }
      },
    };
    const uow = createDrizzleCrmpUnitOfWork(async () => db as never);
    await expect(
      uow.commitOpenShift({
        restaurantId: 1,
        registerId: "reg_1",
        createShift: (shiftNumber) => ({
          financialShiftId: "fsh_new",
          shiftNumber,
          restaurantId: 1,
          registerId: "reg_1",
          operatorUserId: 10,
          status: "open",
          openingFloatAmount: "1.00",
          currencyCode: "SAR",
          drawer: {
            drawerId: "drw_1",
            currencyCode: "SAR",
            movements: [
              {
                movementId: "mov_1",
                movementType: "opening_float",
                amount: "1.00",
                currencyCode: "SAR",
                reason: "opening_float",
                actorUserId: 10,
                recordedAt: "t0",
              },
            ],
            counts: [],
          },
          handover: null,
          attributions: [],
          version: 1,
          openedAt: "t0",
          closedAt: null,
          closeReason: null,
          archivedAt: null,
          updatedAt: "t0",
        }),
      })
    ).rejects.toThrow(/child persist failed/);
    expect(rolledBack).toBe(true);
    expect(tx.update).not.toHaveBeenCalled();
  });
});
