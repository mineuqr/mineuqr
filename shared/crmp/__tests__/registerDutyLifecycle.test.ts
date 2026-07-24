import { describe, expect, it } from "vitest";
import {
  activateRegister,
  assignOperator,
  attachDevice,
  buildRegisterOpenedEvent,
  closeRegister,
  deactivateRegister,
  detachDevice,
  openRegister,
  provisionRegister,
  reassignOperator,
  releaseOperator,
  replaceDevice,
  resolveActiveRegister,
  resolveRegisterByDevice,
  resolveRegisterByOperator,
  resumeRegister,
  suspendRegister,
  CrmpConflictError,
  CrmpInvariantError,
  CrmpInvalidTransitionError,
  CrmpNotFoundError,
} from "../index";

function catalogActive(id = "reg_1") {
  return activateRegister({
    register: provisionRegister({
      registerId: id,
      restaurantId: 1,
      displayName: "Front",
      createdAt: "t0",
    }),
    at: "t1",
  });
}

describe("REGISTER-OPERATIONS-IMPLEMENTATION-1 Duty lifecycle", () => {
  it("provisions with Duty closed", () => {
    const r = provisionRegister({
      registerId: "reg_1",
      restaurantId: 1,
      displayName: "Front",
      createdAt: "t0",
    });
    expect(r.dutyStatus).toBe("closed");
    expect(r.assignedOperatorUserId).toBeNull();
  });

  it("Open → Suspend → Resume → Close", () => {
    let r = openRegister({
      register: catalogActive(),
      at: "t2",
      operatorUserId: 7,
    });
    expect(r.dutyStatus).toBe("open");
    expect(r.assignedOperatorUserId).toBe(7);
    expect(buildRegisterOpenedEvent(r, "t2").eventType).toBe("RegisterOpened");

    r = suspendRegister({ register: r, at: "t3" });
    expect(r.dutyStatus).toBe("suspended");

    r = resumeRegister({ register: r, at: "t4" });
    expect(r.dutyStatus).toBe("open");

    r = closeRegister({ register: r, hasActiveShift: false, at: "t5" });
    expect(r.dutyStatus).toBe("closed");
    expect(r.assignedOperatorUserId).toBeNull();
  });

  it("OpenRegister is idempotent when already open same operator", () => {
    const open = openRegister({
      register: catalogActive(),
      at: "t2",
      operatorUserId: 7,
    });
    const again = openRegister({
      register: open,
      at: "t3",
      operatorUserId: 7,
    });
    expect(again).toBe(open);
  });

  it("rejects Open when catalog not active", () => {
    const provisioned = provisionRegister({
      registerId: "reg_1",
      restaurantId: 1,
      displayName: "Front",
      createdAt: "t0",
    });
    expect(() => openRegister({ register: provisioned, at: "t1" })).toThrow(
      CrmpInvariantError
    );
  });

  it("rejects Close while active Financial Shift", () => {
    const open = openRegister({
      register: catalogActive(),
      at: "t2",
      operatorUserId: 7,
    });
    expect(() =>
      closeRegister({ register: open, hasActiveShift: true, at: "t3" })
    ).toThrow(CrmpInvariantError);
  });

  it("rejects illegal Duty transition closed → suspended", () => {
    expect(() =>
      suspendRegister({ register: catalogActive(), at: "t2" })
    ).toThrow(CrmpInvalidTransitionError);
  });

  it("inactive catalog cannot resume", () => {
    const open = openRegister({
      register: catalogActive(),
      at: "t2",
    });
    const closed = closeRegister({
      register: open,
      hasActiveShift: false,
      at: "t3",
    });
    const inactive = deactivateRegister({
      register: closed,
      hasActiveShift: false,
      at: "t4",
    });
    expect(() => resumeRegister({ register: inactive, at: "t5" })).toThrow(
      CrmpInvariantError
    );
  });

  it("deactivate requires Duty closed", () => {
    const open = openRegister({
      register: catalogActive(),
      at: "t2",
    });
    expect(() =>
      deactivateRegister({
        register: open,
        hasActiveShift: false,
        at: "t3",
      })
    ).toThrow(CrmpInvariantError);
  });
});

describe("REGISTER-OPERATIONS-IMPLEMENTATION-1 operator ownership", () => {
  it("Assign / Release / Reassign", () => {
    let r = openRegister({ register: catalogActive(), at: "t2" });
    r = assignOperator({ register: r, operatorUserId: 7, at: "t3" });
    expect(r.assignedOperatorUserId).toBe(7);
    const same = assignOperator({ register: r, operatorUserId: 7, at: "t4" });
    expect(same).toBe(r);

    expect(() =>
      assignOperator({ register: r, operatorUserId: 8, at: "t5" })
    ).toThrow(CrmpConflictError);

    r = reassignOperator({ register: r, operatorUserId: 8, at: "t6" });
    expect(r.assignedOperatorUserId).toBe(8);

    r = releaseOperator({ register: r, at: "t7" });
    expect(r.assignedOperatorUserId).toBeNull();
    expect(releaseOperator({ register: r, at: "t8" })).toBe(r);
  });

  it("rejects duplicate operator across Duty-active registers", () => {
    const a = openRegister({
      register: catalogActive("reg_a"),
      at: "t2",
      operatorUserId: 7,
    });
    const bOpen = openRegister({
      register: catalogActive("reg_b"),
      at: "t3",
    });
    expect(() =>
      assignOperator({
        register: bOpen,
        operatorUserId: 7,
        at: "t4",
        siblingRegisters: [a, bOpen],
      })
    ).toThrow(CrmpConflictError);
  });

  it("cannot assign while Duty closed", () => {
    expect(() =>
      assignOperator({
        register: catalogActive(),
        operatorUserId: 7,
        at: "t2",
      })
    ).toThrow(CrmpInvariantError);
  });
});

describe("REGISTER-OPERATIONS-IMPLEMENTATION-1 device association", () => {
  it("attach / detach / replace", () => {
    let r = catalogActive();
    r = attachDevice({ register: r, deviceId: "dev_1", at: "t2" });
    expect(r.deviceId).toBe("dev_1");
    expect(attachDevice({ register: r, deviceId: "dev_1", at: "t3" })).toBe(r);

    r = replaceDevice({ register: r, deviceId: "dev_2", at: "t4" });
    expect(r.deviceId).toBe("dev_2");

    r = detachDevice({ register: r, at: "t5" });
    expect(r.deviceId).toBeNull();
  });

  it("rejects device attached to two registers", () => {
    const a = attachDevice({
      register: catalogActive("reg_a"),
      deviceId: "dev_x",
      at: "t2",
    });
    expect(() =>
      attachDevice({
        register: catalogActive("reg_b"),
        deviceId: "dev_x",
        at: "t3",
        siblingRegisters: [a],
      })
    ).toThrow(CrmpConflictError);
  });
});

describe("REGISTER-OPERATIONS-IMPLEMENTATION-1 resolve", () => {
  it("resolveActiveRegister requires exactly one Duty-open", () => {
    const open = openRegister({
      register: catalogActive(),
      at: "t2",
    });
    expect(
      resolveActiveRegister({ restaurantId: 1, registers: [open] }).registerId
    ).toBe("reg_1");

    expect(() =>
      resolveActiveRegister({
        restaurantId: 1,
        registers: [catalogActive()],
      })
    ).toThrow(CrmpNotFoundError);

    const a = openRegister({
      register: catalogActive("reg_a"),
      at: "t2",
    });
    const b = openRegister({
      register: catalogActive("reg_b"),
      at: "t2",
    });
    expect(() =>
      resolveActiveRegister({ restaurantId: 1, registers: [a, b] })
    ).toThrow(CrmpConflictError);
  });

  it("resolve by device and operator", () => {
    const r = openRegister({
      register: attachDevice({
        register: catalogActive(),
        deviceId: "dev_1",
        at: "t2",
      }),
      at: "t3",
      operatorUserId: 9,
    });
    expect(
      resolveRegisterByDevice({
        restaurantId: 1,
        deviceId: "dev_1",
        registers: [r],
      }).registerId
    ).toBe("reg_1");
    expect(
      resolveRegisterByOperator({
        restaurantId: 1,
        operatorUserId: 9,
        registers: [r],
      }).registerId
    ).toBe("reg_1");
  });
});
