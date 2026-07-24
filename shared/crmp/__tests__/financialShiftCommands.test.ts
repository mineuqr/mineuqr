import { describe, expect, it } from "vitest";
import {
  acceptHandover,
  closeFinancialShift,
  createSettlementAttribution,
  initiateHandover,
  openFinancialShift,
  recordDrawerCount,
  recordDrawerMovement,
  rejectHandover,
} from "../financialShift/financialShiftCommands";
import { computeExpectedCash } from "../financialShift/expectedCash";
import {
  activateRegister,
  openRegister,
  provisionRegister,
} from "../register/registerCommands";
import { CrmpConflictError, CrmpImmutabilityError, CrmpInvariantError } from "../crmpErrors";

function activeRegister() {
  const catalog = activateRegister({
    register: provisionRegister({
      registerId: "reg_1",
      restaurantId: 1,
      code: "FRONT",
      registerType: "counter",
      displayName: "Front",
      createdAt: "t0",
    }),
    at: "t1",
  });
  return openRegister({ register: catalog, at: "t1b", operatorUserId: 10 });
}

function openShift() {
  return openFinancialShift({
    financialShiftId: "fsh_1",
    drawerId: "drw_1",
    openingMovementId: "mov_1",
    register: activeRegister(),
    hasActiveShiftOnRegister: false,
    restaurantId: 1,
    operatorUserId: 10,
    openingFloatAmount: "100.00",
    currencyCode: "SAR",
    openedAt: "t2",
  });
}

describe("CRMP Financial Shift commands", () => {
  it("opens with opening float movement (D-INV-11/12)", () => {
    const shift = openShift();
    expect(shift.status).toBe("open");
    expect(shift.drawer.movements).toHaveLength(1);
    expect(shift.drawer.movements[0]?.movementType).toBe("opening_float");
    expect(computeExpectedCash(shift)).toBe("100.00");
  });

  it("rejects concurrent open (D-INV-02)", () => {
    expect(() =>
      openFinancialShift({
        financialShiftId: "fsh_2",
        drawerId: "drw_2",
        openingMovementId: "mov_2",
        register: activeRegister(),
        hasActiveShiftOnRegister: true,
        restaurantId: 1,
        operatorUserId: 10,
        openingFloatAmount: "0",
        currencyCode: "SAR",
        openedAt: "t3",
      })
    ).toThrow(CrmpConflictError);
  });

  it("computes expected cash from movements + attributions (D-INV-14)", () => {
    let shift = openShift();
    shift = recordDrawerMovement({
      shift,
      movementId: "mov_in",
      movementType: "paid_in",
      amount: "20.00",
      reason: "change bag",
      actorUserId: 10,
      recordedAt: "t3",
    });
    shift = recordDrawerMovement({
      shift,
      movementId: "mov_drop",
      movementType: "safe_drop",
      amount: "50.00",
      reason: "safe",
      actorUserId: 10,
      recordedAt: "t4",
    });
    const attr = createSettlementAttribution({
      shift,
      attributionId: "attr_1",
      settlementRecordId: "sr:1:1:settlement:1",
      operatorUserId: 10,
      cashTenderAmount: "35.50",
      attributedAt: "t5",
    });
    shift = attr.shift;
    expect(computeExpectedCash(shift)).toBe("105.50"); // 100+20-50+35.50
  });

  it("attribution is idempotent by settlementRecordId (D-INV-13)", () => {
    const shift = openShift();
    const first = createSettlementAttribution({
      shift,
      attributionId: "attr_1",
      settlementRecordId: "sr:abc",
      operatorUserId: 10,
      cashTenderAmount: "10.00",
      attributedAt: "t3",
    });
    const second = createSettlementAttribution({
      shift: first.shift,
      attributionId: "attr_2",
      settlementRecordId: "sr:abc",
      operatorUserId: 10,
      cashTenderAmount: "99.00",
      attributedAt: "t4",
    });
    expect(second.alreadyApplied).toBe(true);
    expect(second.shift.attributions).toHaveLength(1);
    expect(second.attribution.cashTenderAmount).toBe("10.00");
  });

  it("requires settlementRecordId for attribution (D-INV-04)", () => {
    expect(() =>
      createSettlementAttribution({
        shift: openShift(),
        attributionId: "a",
        settlementRecordId: "  ",
        operatorUserId: 10,
        cashTenderAmount: "0",
        attributedAt: "t",
      })
    ).toThrow();
  });

  it("closes only with final count; then immutable (D-INV-03/15)", () => {
    let shift = openShift();
    expect(() => closeFinancialShift({ shift, closedAt: "t9" })).toThrow(
      CrmpInvariantError
    );
    shift = recordDrawerCount({
      shift,
      countId: "cnt_1",
      kind: "final",
      actualAmount: "100.00",
      actorUserId: 10,
      recordedAt: "t8",
    });
    const closed = closeFinancialShift({ shift, closedAt: "t9" });
    expect(closed.status).toBe("closed");
    expect(() =>
      recordDrawerMovement({
        shift: closed,
        movementId: "x",
        movementType: "paid_in",
        amount: "1.00",
        reason: "x",
        actorUserId: 10,
        recordedAt: "t10",
      })
    ).toThrow(CrmpImmutabilityError);
  });

  it("handover requires two distinct users (D-INV-06)", () => {
    expect(() =>
      initiateHandover({
        shift: openShift(),
        handoverId: "ho_1",
        initiatorUserId: 10,
        receiverUserId: 10,
        offeredAt: "t3",
      })
    ).toThrow(CrmpInvariantError);
  });

  it("accept handover closes A and opens B with counted actual", () => {
    let shift = openShift();
    shift = initiateHandover({
      shift,
      handoverId: "ho_1",
      initiatorUserId: 10,
      receiverUserId: 20,
      offeredAt: "t3",
    });
    shift = recordDrawerCount({
      shift,
      countId: "cnt_f",
      kind: "final",
      actualAmount: "95.00",
      actorUserId: 10,
      recordedAt: "t4",
    });
    const { closed, successor } = acceptHandover({
      outgoing: shift,
      register: activeRegister(),
      acceptingUserId: 20,
      successorShiftId: "fsh_2",
      successorDrawerId: "drw_2",
      successorOpeningMovementId: "mov_2",
      acceptedAt: "t5",
    });
    expect(closed.status).toBe("closed");
    expect(closed.handover?.outcome).toBe("accepted");
    expect(successor.status).toBe("open");
    expect(successor.operatorUserId).toBe(20);
    expect(successor.openingFloatAmount).toBe("95.00");
  });

  it("reject handover returns to open", () => {
    let shift = openShift();
    shift = initiateHandover({
      shift,
      handoverId: "ho_1",
      initiatorUserId: 10,
      receiverUserId: 20,
      offeredAt: "t3",
    });
    shift = rejectHandover({ shift, rejectedAt: "t4" });
    expect(shift.status).toBe("open");
    expect(shift.handover?.outcome).toBe("rejected");
  });

  it("variance is derived (D-INV-07)", () => {
    let shift = openShift();
    shift = recordDrawerCount({
      shift,
      countId: "c1",
      kind: "interim",
      actualAmount: "90.00",
      actorUserId: 10,
      recordedAt: "t3",
    });
    expect(shift.drawer.counts[0]?.varianceAmount).toBe("-10.00");
    expect(shift.drawer.counts[0]?.expectedAmount).toBe("100.00");
  });
});
