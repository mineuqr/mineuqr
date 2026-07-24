import { describe, expect, it } from "vitest";
import { activateRegister, openRegister, provisionRegister } from "@shared/crmp";
import { toRegisterDto } from "../crmpApiMapper";

describe("crmpApiMapper", () => {
  it("maps operational fields and hides nothing required for concurrency", () => {
    const register = openRegister({
      register: activateRegister({
        register: provisionRegister({
          registerId: "reg_1",
          restaurantId: 1,
          displayName: "Front",
          createdAt: "t0",
        }),
        at: "t1",
      }),
      at: "t2",
      operatorUserId: 7,
    });
    const dto = toRegisterDto(register);
    expect(dto).toEqual({
      registerId: "reg_1",
      restaurantId: 1,
      displayName: "Front",
      catalogStatus: "active",
      dutyStatus: "open",
      deviceId: null,
      assignedOperatorUserId: 7,
      operatorAssignedAt: "t2",
      version: register.version,
      updatedAt: register.updatedAt,
    });
    expect(dto).not.toHaveProperty("events");
    expect(dto).not.toHaveProperty("status");
  });
});
