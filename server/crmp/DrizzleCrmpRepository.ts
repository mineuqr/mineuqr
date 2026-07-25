/**
 * CRMP / SHIFT-LIFECYCLE-IMPLEMENTATION-1 — Drizzle persistence adapters.
 * Repository responsibilities only — no domain rules.
 */

import { and, desc, eq, gte, inArray, like, lte, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  crmpDrawerCounts,
  crmpDrawerMovements,
  crmpFinancialShifts,
  crmpRegisters,
  crmpSettlementAttributions,
  crmpShiftHandovers,
} from "../../drizzle/schema";
import {
  CrmpConflictError,
  type CashRegister,
  type DrawerCount,
  type DrawerMovement,
  type FinancialShift,
  type SettlementAttribution,
  type ShiftHandover,
} from "@shared/crmp";
import type {
  CrmpFinancialShiftRepository,
  CrmpRegisterRepository,
  CrmpUnitOfWork,
  FinancialShiftArchiveListQuery,
} from "./CrmpRepository";

function mapRegister(
  row: typeof crmpRegisters.$inferSelect
): CashRegister {
  return {
    registerId: row.registerId,
    restaurantId: row.restaurantId,
    code: row.code,
    displayName: row.displayName,
    registerType: row.registerType,
    status: row.status,
    dutyStatus: row.dutyStatus,
    archivedAt: row.archivedAt ?? null,
    deviceId: row.deviceId ?? null,
    assignedOperatorUserId: row.assignedOperatorUserId ?? null,
    operatorAssignedAt: row.operatorAssignedAt ?? null,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadShiftGraph(
  restaurantId: number,
  shiftRow: typeof crmpFinancialShifts.$inferSelect
): Promise<FinancialShift> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [movements, counts, handovers, attributions] = await Promise.all([
    db
      .select()
      .from(crmpDrawerMovements)
      .where(eq(crmpDrawerMovements.financialShiftId, shiftRow.financialShiftId)),
    db
      .select()
      .from(crmpDrawerCounts)
      .where(eq(crmpDrawerCounts.financialShiftId, shiftRow.financialShiftId)),
    db
      .select()
      .from(crmpShiftHandovers)
      .where(eq(crmpShiftHandovers.financialShiftId, shiftRow.financialShiftId))
      .limit(1),
    db
      .select()
      .from(crmpSettlementAttributions)
      .where(
        eq(crmpSettlementAttributions.financialShiftId, shiftRow.financialShiftId)
      ),
  ]);

  const movementEntities: DrawerMovement[] = movements.map((m) => ({
    movementId: m.movementId,
    movementType: m.movementType,
    amount: String(m.amount),
    currencyCode: m.currencyCode,
    reason: m.reason ?? null,
    actorUserId: m.actorUserId,
    recordedAt: m.recordedAt,
  }));

  const countEntities: DrawerCount[] = counts.map((c) => ({
    countId: c.countId,
    kind: c.kind,
    expectedAmount: String(c.expectedAmount),
    actualAmount: String(c.actualAmount),
    varianceAmount: String(c.varianceAmount),
    currencyCode: c.currencyCode,
    actorUserId: c.actorUserId,
    recordedAt: c.recordedAt,
  }));

  const handover: ShiftHandover | null = handovers[0]
    ? {
        handoverId: handovers[0].handoverId,
        initiatorUserId: handovers[0].initiatorUserId,
        receiverUserId: handovers[0].receiverUserId,
        outcome: handovers[0].outcome,
        finalCountId: handovers[0].finalCountId ?? null,
        offeredAt: handovers[0].offeredAt,
        resolvedAt: handovers[0].resolvedAt ?? null,
      }
    : null;

  const attrs: SettlementAttribution[] = attributions.map((a) => ({
    attributionId: a.attributionId,
    restaurantId: a.restaurantId,
    registerId: a.registerId,
    financialShiftId: a.financialShiftId,
    settlementRecordId: a.settlementRecordId,
    operatorUserId: a.operatorUserId,
    cashTenderAmount: String(a.cashTenderAmount),
    currencyCode: a.currencyCode,
    attributedAt: a.attributedAt,
  }));

  return {
    financialShiftId: shiftRow.financialShiftId,
    restaurantId: shiftRow.restaurantId,
    registerId: shiftRow.registerId,
    operatorUserId: shiftRow.operatorUserId,
    status: shiftRow.status,
    shiftNumber: shiftRow.shiftNumber,
    openingFloatAmount: String(shiftRow.openingFloatAmount),
    currencyCode: shiftRow.currencyCode,
    drawer: {
      drawerId: shiftRow.drawerId,
      currencyCode: shiftRow.currencyCode,
      movements: movementEntities,
      counts: countEntities,
    },
    handover,
    attributions: attrs,
    version: shiftRow.version,
    openedAt: shiftRow.openedAt,
    closedAt: shiftRow.closedAt ?? null,
    closeReason: shiftRow.closeReason ?? null,
    archivedAt: shiftRow.archivedAt ?? null,
    updatedAt: shiftRow.updatedAt,
  };
}

async function persistShiftGraph(shift: FinancialShift): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(crmpFinancialShifts)
    .values({
      financialShiftId: shift.financialShiftId,
      shiftNumber: shift.shiftNumber,
      restaurantId: shift.restaurantId,
      registerId: shift.registerId,
      operatorUserId: shift.operatorUserId,
      status: shift.status,
      openingFloatAmount: shift.openingFloatAmount,
      currencyCode: shift.currencyCode,
      drawerId: shift.drawer.drawerId,
      version: shift.version,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      closeReason: shift.closeReason,
      archivedAt: shift.archivedAt,
      updatedAt: shift.updatedAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: shift.status,
        operatorUserId: shift.operatorUserId,
        version: shift.version,
        closedAt: shift.closedAt,
        closeReason: shift.closeReason,
        archivedAt: shift.archivedAt,
        updatedAt: shift.updatedAt,
        // shiftNumber is immutable — never updated
      },
    });

  // Replace children by delete+insert for this shift (append-only domain; full graph rewrite ok).
  await db
    .delete(crmpDrawerMovements)
    .where(eq(crmpDrawerMovements.financialShiftId, shift.financialShiftId));
  if (shift.drawer.movements.length > 0) {
    await db.insert(crmpDrawerMovements).values(
      shift.drawer.movements.map((m) => ({
        movementId: m.movementId,
        financialShiftId: shift.financialShiftId,
        restaurantId: shift.restaurantId,
        movementType: m.movementType,
        amount: m.amount,
        currencyCode: m.currencyCode,
        reason: m.reason,
        actorUserId: m.actorUserId,
        recordedAt: m.recordedAt,
      }))
    );
  }

  await db
    .delete(crmpDrawerCounts)
    .where(eq(crmpDrawerCounts.financialShiftId, shift.financialShiftId));
  if (shift.drawer.counts.length > 0) {
    await db.insert(crmpDrawerCounts).values(
      shift.drawer.counts.map((c) => ({
        countId: c.countId,
        financialShiftId: shift.financialShiftId,
        restaurantId: shift.restaurantId,
        kind: c.kind,
        expectedAmount: c.expectedAmount,
        actualAmount: c.actualAmount,
        varianceAmount: c.varianceAmount,
        currencyCode: c.currencyCode,
        actorUserId: c.actorUserId,
        recordedAt: c.recordedAt,
      }))
    );
  }

  await db
    .delete(crmpShiftHandovers)
    .where(eq(crmpShiftHandovers.financialShiftId, shift.financialShiftId));
  if (shift.handover) {
    await db.insert(crmpShiftHandovers).values({
      handoverId: shift.handover.handoverId,
      financialShiftId: shift.financialShiftId,
      restaurantId: shift.restaurantId,
      initiatorUserId: shift.handover.initiatorUserId,
      receiverUserId: shift.handover.receiverUserId,
      outcome: shift.handover.outcome,
      finalCountId: shift.handover.finalCountId,
      offeredAt: shift.handover.offeredAt,
      resolvedAt: shift.handover.resolvedAt,
    });
  }

  await db
    .delete(crmpSettlementAttributions)
    .where(
      eq(crmpSettlementAttributions.financialShiftId, shift.financialShiftId)
    );
  if (shift.attributions.length > 0) {
    await db.insert(crmpSettlementAttributions).values(
      shift.attributions.map((a) => ({
        attributionId: a.attributionId,
        restaurantId: a.restaurantId,
        registerId: a.registerId,
        financialShiftId: a.financialShiftId,
        settlementRecordId: a.settlementRecordId,
        operatorUserId: a.operatorUserId,
        cashTenderAmount: a.cashTenderAmount,
        currencyCode: a.currencyCode,
        attributedAt: a.attributedAt,
      }))
    );
  }
}

export function createDrizzleCrmpUnitOfWork(): CrmpUnitOfWork {
  const registers: CrmpRegisterRepository = {
    async insert(register) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(crmpRegisters).values({
        registerId: register.registerId,
        restaurantId: register.restaurantId,
        code: register.code,
        displayName: register.displayName,
        registerType: register.registerType,
        status: register.status,
        dutyStatus: register.dutyStatus,
        archivedAt: register.archivedAt,
        deviceId: register.deviceId,
        assignedOperatorUserId: register.assignedOperatorUserId,
        operatorAssignedAt: register.operatorAssignedAt,
        version: register.version,
        createdAt: register.createdAt,
        updatedAt: register.updatedAt,
      });
    },
    async update(register, expectedVersion) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (expectedVersion != null) {
        const rows = await db
          .select({ version: crmpRegisters.version })
          .from(crmpRegisters)
          .where(
            and(
              eq(crmpRegisters.restaurantId, register.restaurantId),
              eq(crmpRegisters.registerId, register.registerId)
            )
          )
          .limit(1);
        if (rows[0] && rows[0].version !== expectedVersion) {
          throw new CrmpConflictError(
            `Register version conflict: expected ${expectedVersion}, found ${rows[0].version}`
          );
        }
      }
      await db
        .update(crmpRegisters)
        .set({
          code: register.code,
          displayName: register.displayName,
          registerType: register.registerType,
          status: register.status,
          dutyStatus: register.dutyStatus,
          archivedAt: register.archivedAt,
          deviceId: register.deviceId,
          assignedOperatorUserId: register.assignedOperatorUserId,
          operatorAssignedAt: register.operatorAssignedAt,
          version: register.version,
          updatedAt: register.updatedAt,
        })
        .where(
          and(
            eq(crmpRegisters.restaurantId, register.restaurantId),
            eq(crmpRegisters.registerId, register.registerId)
          )
        );
    },
    async findById(restaurantId, registerId) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(crmpRegisters)
        .where(
          and(
            eq(crmpRegisters.restaurantId, restaurantId),
            eq(crmpRegisters.registerId, registerId)
          )
        )
        .limit(1);
      return rows[0] ? mapRegister(rows[0]) : null;
    },
    async listByRestaurant(restaurantId) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(crmpRegisters)
        .where(eq(crmpRegisters.restaurantId, restaurantId));
      return rows.map(mapRegister);
    },
  };

  const shifts: CrmpFinancialShiftRepository = {
    async insert(shift) {
      await persistShiftGraph(shift);
    },
    async save(shift, expectedVersion) {
      if (expectedVersion != null) {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const rows = await db
          .select({ version: crmpFinancialShifts.version })
          .from(crmpFinancialShifts)
          .where(
            and(
              eq(crmpFinancialShifts.restaurantId, shift.restaurantId),
              eq(
                crmpFinancialShifts.financialShiftId,
                shift.financialShiftId
              )
            )
          )
          .limit(1);
        if (rows[0] && rows[0].version !== expectedVersion) {
          throw new CrmpConflictError(
            `Financial Shift version conflict: expected ${expectedVersion}, found ${rows[0].version}`
          );
        }
      }
      await persistShiftGraph(shift);
    },
    async findById(restaurantId, financialShiftId) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(crmpFinancialShifts)
        .where(
          and(
            eq(crmpFinancialShifts.restaurantId, restaurantId),
            eq(crmpFinancialShifts.financialShiftId, financialShiftId)
          )
        )
        .limit(1);
      if (!rows[0]) return null;
      return loadShiftGraph(restaurantId, rows[0]);
    },
    async findActiveByRegister(restaurantId, registerId) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(crmpFinancialShifts)
        .where(
          and(
            eq(crmpFinancialShifts.restaurantId, restaurantId),
            eq(crmpFinancialShifts.registerId, registerId),
            inArray(crmpFinancialShifts.status, [
              "open",
              "suspended",
              "closing",
              "handover_pending",
            ])
          )
        )
        .limit(1);
      if (!rows[0]) return null;
      return loadShiftGraph(restaurantId, rows[0]);
    },
    async findActiveByOperator(restaurantId, operatorUserId) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(crmpFinancialShifts)
        .where(
          and(
            eq(crmpFinancialShifts.restaurantId, restaurantId),
            eq(crmpFinancialShifts.operatorUserId, operatorUserId),
            inArray(crmpFinancialShifts.status, [
              "open",
              "suspended",
              "closing",
              "handover_pending",
            ])
          )
        );
      return Promise.all(
        rows.map((row) => loadShiftGraph(restaurantId, row))
      );
    },
    async listByRegister(restaurantId, registerId) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(crmpFinancialShifts)
        .where(
          and(
            eq(crmpFinancialShifts.restaurantId, restaurantId),
            eq(crmpFinancialShifts.registerId, registerId)
          )
        );
      return Promise.all(
        rows.map((row) => loadShiftGraph(restaurantId, row))
      );
    },
    async allocateNextShiftNumber(restaurantId, registerId) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.execute(sql`
        INSERT INTO crmp_register_shift_sequences (restaurantId, registerId, lastNumber)
        VALUES (${restaurantId}, ${registerId}, LAST_INSERT_ID(1))
        ON DUPLICATE KEY UPDATE lastNumber = LAST_INSERT_ID(lastNumber + 1)
      `);
      const [seqRow] = await db.execute(sql`SELECT LAST_INSERT_ID() AS n`);
      const n = Number((seqRow as { n: number }[])[0]?.n ?? 1);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error("Failed to allocate shiftNumber");
      }
      return n;
    },
    async listArchive(query: FinancialShiftArchiveListQuery) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const statuses = query.status?.length
        ? query.status
        : (["closed", "archived"] as const);
      const predicates = [
        eq(crmpFinancialShifts.restaurantId, query.restaurantId),
        inArray(
          crmpFinancialShifts.status,
          statuses as Array<
            "closed" | "archived" | "open" | "suspended" | "closing" | "handover_pending"
          >
        ),
      ];
      if (query.registerId) {
        predicates.push(eq(crmpFinancialShifts.registerId, query.registerId));
      }
      if (query.fromIso) {
        predicates.push(gte(crmpFinancialShifts.closedAt, query.fromIso));
      }
      if (query.toIso) {
        predicates.push(lte(crmpFinancialShifts.closedAt, query.toIso));
      }
      if (query.shiftNumber != null) {
        predicates.push(eq(crmpFinancialShifts.shiftNumber, query.shiftNumber));
      }
      if (query.operatorUserId != null) {
        predicates.push(
          eq(crmpFinancialShifts.operatorUserId, query.operatorUserId)
        );
      }
      if (query.financialShiftIdQuery?.trim()) {
        predicates.push(
          like(
            crmpFinancialShifts.financialShiftId,
            `%${query.financialShiftIdQuery.trim()}%`
          )
        );
      }
      const where = and(...predicates);
      const countRows = await db
        .select({ c: sql<number>`count(*)` })
        .from(crmpFinancialShifts)
        .where(where);
      const total = Number(countRows[0]?.c ?? 0);
      const rows = await db
        .select()
        .from(crmpFinancialShifts)
        .where(where)
        .orderBy(desc(crmpFinancialShifts.closedAt), desc(crmpFinancialShifts.openedAt))
        .limit(query.limit)
        .offset(query.offset);
      const loaded = await Promise.all(
        rows.map((row) => loadShiftGraph(query.restaurantId, row))
      );
      return { rows: loaded, total };
    },
    async findAttributionBySettlementRecordId(
      restaurantId,
      settlementRecordId
    ) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(crmpSettlementAttributions)
        .where(
          and(
            eq(crmpSettlementAttributions.restaurantId, restaurantId),
            eq(crmpSettlementAttributions.settlementRecordId, settlementRecordId)
          )
        )
        .limit(1);
      const a = rows[0];
      if (!a) return null;
      return {
        attributionId: a.attributionId,
        restaurantId: a.restaurantId,
        registerId: a.registerId,
        financialShiftId: a.financialShiftId,
        settlementRecordId: a.settlementRecordId,
        operatorUserId: a.operatorUserId,
        cashTenderAmount: String(a.cashTenderAmount),
        currencyCode: a.currencyCode,
        attributedAt: a.attributedAt,
      };
    },
  };

  return { registers, shifts };
}
