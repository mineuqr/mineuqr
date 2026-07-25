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
  const shiftSequences = new Map<string, number>();

  const registerRepo: CrmpRegisterRepository = {
    async insert(register) {
      const key = `${register.restaurantId}:${register.registerId}`;
      if (registers.has(key)) {
        throw new Error(`Register already exists: ${register.registerId}`);
      }
      registers.set(key, cloneRegister(register));
    },
    async update(register, expectedVersion) {
      const key = `${register.restaurantId}:${register.registerId}`;
      const existing = registers.get(key);
      if (!existing) throw new Error(`Register not found: ${register.registerId}`);
      if (
        expectedVersion != null &&
        existing.version !== expectedVersion
      ) {
        throw new CrmpConflictError(
          `Register version conflict: expected ${expectedVersion}, found ${existing.version}`
        );
      }
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
    async allocateNextShiftNumber(restaurantId, registerId) {
      const key = `${restaurantId}:${registerId}`;
      const next = (shiftSequences.get(key) ?? 0) + 1;
      shiftSequences.set(key, next);
      return next;
    },
    async listArchive(query) {
      const statuses = new Set(
        query.status?.length ? query.status : ["closed", "archived"]
      );
      let rows = [...shifts.values()].filter((s) => {
        if (s.restaurantId !== query.restaurantId) return false;
        if (!statuses.has(s.status)) return false;
        if (query.registerId && s.registerId !== query.registerId) return false;
        if (query.shiftNumber != null && s.shiftNumber !== query.shiftNumber) {
          return false;
        }
        if (
          query.operatorUserId != null &&
          s.operatorUserId !== query.operatorUserId
        ) {
          return false;
        }
        if (
          query.financialShiftIdQuery?.trim() &&
          !s.financialShiftId.includes(query.financialShiftIdQuery.trim())
        ) {
          return false;
        }
        const closedAt = s.closedAt ?? s.openedAt;
        if (query.fromIso && closedAt < query.fromIso) return false;
        if (query.toIso && closedAt > query.toIso) return false;
        return true;
      });
      rows.sort((a, b) => {
        const ac = a.closedAt ?? a.openedAt;
        const bc = b.closedAt ?? b.openedAt;
        return bc.localeCompare(ac);
      });
      const total = rows.length;
      rows = rows.slice(query.offset, query.offset + query.limit);
      return { rows: rows.map(cloneShift), total };
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
