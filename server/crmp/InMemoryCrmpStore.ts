/**
 * CRMP / SHIFT-LIFECYCLE-IMPLEMENTATION-1 — in-memory repositories.
 */

import type {
  CashRegister,
  FinancialShift,
  SettlementAttribution,
} from "@shared/crmp";
import { CrmpConflictError, isActiveShiftStatus } from "@shared/crmp";
import type {
  CrmpFinancialShiftRepository,
  CrmpRegisterRepository,
  CrmpUnitOfWork,
} from "./CrmpRepository";

function cloneRegister(r: CashRegister): CashRegister {
  return { ...r };
}

function cloneShift(s: FinancialShift): FinancialShift {
  return structuredClone(s);
}

export function createInMemoryCrmpStore(): CrmpUnitOfWork {
  const registers = new Map<string, CashRegister>();
  const shifts = new Map<string, FinancialShift>();

  const registerRepo: CrmpRegisterRepository = {
    async insert(register) {
      const key = `${register.restaurantId}:${register.registerId}`;
      if (registers.has(key)) {
        throw new Error(`Register already exists: ${register.registerId}`);
      }
      registers.set(key, cloneRegister(register));
    },
    async update(register) {
      const key = `${register.restaurantId}:${register.registerId}`;
      const existing = registers.get(key);
      if (!existing) throw new Error(`Register not found: ${register.registerId}`);
      registers.set(key, cloneRegister(register));
    },
    async findById(restaurantId, registerId) {
      const row = registers.get(`${restaurantId}:${registerId}`);
      return row ? cloneRegister(row) : null;
    },
    async listByRestaurant(restaurantId) {
      return [...registers.values()]
        .filter((r) => r.restaurantId === restaurantId)
        .map(cloneRegister);
    },
  };

  const shiftRepo: CrmpFinancialShiftRepository = {
    async insert(shift) {
      if (shifts.has(shift.financialShiftId)) {
        throw new Error(`Shift already exists: ${shift.financialShiftId}`);
      }
      shifts.set(shift.financialShiftId, cloneShift(shift));
    },
    async save(shift, expectedVersion) {
      const current = shifts.get(shift.financialShiftId);
      if (current && expectedVersion != null && current.version !== expectedVersion) {
        throw new CrmpConflictError(
          `Financial Shift version conflict: expected ${expectedVersion}, found ${current.version}`
        );
      }
      shifts.set(shift.financialShiftId, cloneShift(shift));
    },
    async findById(restaurantId, financialShiftId) {
      const row = shifts.get(financialShiftId);
      if (!row || row.restaurantId !== restaurantId) return null;
      return cloneShift(row);
    },
    async findActiveByRegister(restaurantId, registerId) {
      for (const s of shifts.values()) {
        if (
          s.restaurantId === restaurantId &&
          s.registerId === registerId &&
          isActiveShiftStatus(s.status)
        ) {
          return cloneShift(s);
        }
      }
      return null;
    },
    async findActiveByOperator(restaurantId, operatorUserId) {
      return [...shifts.values()]
        .filter(
          (s) =>
            s.restaurantId === restaurantId &&
            s.operatorUserId === operatorUserId &&
            isActiveShiftStatus(s.status)
        )
        .map(cloneShift);
    },
    async listByRegister(restaurantId, registerId) {
      return [...shifts.values()]
        .filter(
          (s) =>
            s.restaurantId === restaurantId && s.registerId === registerId
        )
        .map(cloneShift);
    },
    async findAttributionBySettlementRecordId(
      restaurantId,
      settlementRecordId
    ): Promise<SettlementAttribution | null> {
      for (const s of shifts.values()) {
        if (s.restaurantId !== restaurantId) continue;
        const hit = s.attributions.find(
          (a) => a.settlementRecordId === settlementRecordId
        );
        if (hit) return { ...hit };
      }
      return null;
    },
  };

  return { registers: registerRepo, shifts: shiftRepo };
}
