import { describe, expect, it } from "vitest";
import {
  activateRegister,
  archiveRegister,
  changeRegisterType,
  deactivateRegister,
  openRegister,
  provisionRegister,
  renameRegister,
  updateRegisterCode,
} from "../register/registerCommands";
import {
  buildRegisterActivatedEvent,
  buildRegisterArchivedEvent,
  buildRegisterDeactivatedEvent,
  buildRegisterProvisionedEvent,
  buildRegisterRenamedEvent,
  buildRegisterTypeChangedEvent,
} from "../register/registerEvents";
import {
  CrmpConflictError,
  CrmpImmutabilityError,
  CrmpInvariantError,
  CrmpValidationError,
} from "../crmpErrors";

function provisioned(over: {
  registerId?: string;
  code?: string;
  restaurantId?: number;
} = {}) {
  return provisionRegister({
    registerId: over.registerId ?? "reg_1",
    restaurantId: over.restaurantId ?? 1,
    code: over.code ?? "FRONT",
    displayName: "Front",
    registerType: "counter",
    createdAt: "t0",
  });
}

describe("REGISTER-CATALOG-MANAGEMENT-1 domain", () => {
  it("provisions with code, type, catalog=provisioned, duty=closed", () => {
    const r = provisioned();
    expect(r.code).toBe("FRONT");
    expect(r.registerType).toBe("counter");
    expect(r.status).toBe("provisioned");
    expect(r.dutyStatus).toBe("closed");
    expect(r.archivedAt).toBeNull();
  });

  it("rejects duplicate code within restaurant (case-insensitive)", () => {
    const a = provisioned({ code: "A1" });
    expect(() =>
      provisionRegister({
        registerId: "reg_2",
        restaurantId: 1,
        code: "a1",
        displayName: "Other",
        registerType: "mobile_pos",
        createdAt: "t1",
        siblingRegisters: [a],
      })
    ).toThrow(CrmpConflictError);
  });

  it("allows same code in different restaurants", () => {
    const a = provisioned({ restaurantId: 1, code: "A1" });
    const b = provisionRegister({
      registerId: "reg_2",
      restaurantId: 2,
      code: "A1",
      displayName: "Other",
      registerType: "counter",
      createdAt: "t1",
      siblingRegisters: [a],
    });
    expect(b.code).toBe("A1");
  });

  it("activate / deactivate / rename / changeType", () => {
    const r = provisioned();
    const active = activateRegister({ register: r, at: "t1" });
    expect(active.status).toBe("active");
    const renamed = renameRegister({
      register: active,
      displayName: "Main",
      at: "t2",
    });
    expect(renamed.displayName).toBe("Main");
    const typed = changeRegisterType({
      register: renamed,
      registerType: "settlement_station",
      at: "t3",
    });
    expect(typed.registerType).toBe("settlement_station");
    const inactive = deactivateRegister({
      register: typed,
      hasActiveShift: false,
      at: "t4",
    });
    expect(inactive.status).toBe("inactive");
  });

  it("blocks duty open while provisioned or inactive", () => {
    const provisionedReg = provisioned();
    expect(() =>
      openRegister({ register: provisionedReg, at: "t1" })
    ).toThrow(CrmpInvariantError);

    const inactive = deactivateRegister({
      register: activateRegister({ register: provisionedReg, at: "t1" }),
      hasActiveShift: false,
      at: "t2",
    });
    expect(() => openRegister({ register: inactive, at: "t3" })).toThrow(
      CrmpInvariantError
    );
  });

  it("blocks deactivate while duty open", () => {
    const active = activateRegister({ register: provisioned(), at: "t1" });
    const open = openRegister({
      register: active,
      at: "t2",
      operatorUserId: 7,
    });
    expect(() =>
      deactivateRegister({
        register: open,
        hasActiveShift: false,
        at: "t3",
      })
    ).toThrow(CrmpInvariantError);
  });

  it("soft archives to inactive + archivedAt and blocks further catalog edits", () => {
    const active = activateRegister({ register: provisioned(), at: "t1" });
    const archived = archiveRegister({
      register: active,
      hasActiveShift: false,
      at: "t2",
    });
    expect(archived.status).toBe("inactive");
    expect(archived.archivedAt).toBe("t2");
    expect(() =>
      activateRegister({ register: archived, at: "t3" })
    ).toThrow(CrmpImmutabilityError);
    expect(() =>
      renameRegister({
        register: archived,
        displayName: "X",
        at: "t3",
      })
    ).toThrow(CrmpImmutabilityError);
  });

  it("rejects invalid code", () => {
    expect(() =>
      provisionRegister({
        registerId: "reg_1",
        restaurantId: 1,
        code: " bad code ",
        displayName: "Front",
        registerType: "counter",
        createdAt: "t0",
      })
    ).toThrow(CrmpValidationError);
  });

  it("updateRegisterCode enforces uniqueness", () => {
    const a = activateRegister({
      register: provisioned({ registerId: "reg_a", code: "A" }),
      at: "t1",
    });
    const b = activateRegister({
      register: provisioned({ registerId: "reg_b", code: "B" }),
      at: "t1",
    });
    expect(() =>
      updateRegisterCode({
        register: b,
        code: "A",
        at: "t2",
        siblingRegisters: [a, b],
      })
    ).toThrow(CrmpConflictError);
  });

  it("catalog events are idempotent by claimKey", () => {
    const r = provisioned();
    const e1 = buildRegisterProvisionedEvent(r, "t0");
    const e1b = buildRegisterProvisionedEvent(r, "t0");
    expect(e1.claimKey).toBe(e1b.claimKey);

    const active = activateRegister({ register: r, at: "t1" });
    expect(buildRegisterActivatedEvent(active, "t1").eventType).toBe(
      "RegisterActivated"
    );
    const renamed = renameRegister({
      register: active,
      displayName: "Main",
      at: "t2",
    });
    expect(
      buildRegisterRenamedEvent(renamed, "Front", "t2").previousDisplayName
    ).toBe("Front");
    const typed = changeRegisterType({
      register: renamed,
      registerType: "mobile_pos",
      at: "t3",
    });
    expect(
      buildRegisterTypeChangedEvent(typed, "counter", "t3").previousRegisterType
    ).toBe("counter");
    const inactive = deactivateRegister({
      register: typed,
      hasActiveShift: false,
      at: "t4",
    });
    expect(buildRegisterDeactivatedEvent(inactive, "t4").eventType).toBe(
      "RegisterDeactivated"
    );
    const archived = archiveRegister({
      register: inactive,
      hasActiveShift: false,
      at: "t5",
    });
    expect(buildRegisterArchivedEvent(archived, "t5").archivedAt).toBe("t5");
  });
});
