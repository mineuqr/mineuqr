/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  availabilityLabelFromDto,
  toRegisterListRowVm,
} from "../registerOperationsViewModel";
import type { RegisterDto } from "../registerOperationsApiTypes";

function base(over: Partial<RegisterDto> = {}): RegisterDto {
  return {
    registerId: "reg_1",
    restaurantId: 1,
    displayName: "Front",
    catalogStatus: "active",
    dutyStatus: "closed",
    deviceId: null,
    assignedOperatorUserId: null,
    operatorAssignedAt: null,
    version: 2,
    updatedAt: "t1",
    ...over,
  };
}

describe("registerOperationsViewModel", () => {
  it("maps availability from catalog/duty only", () => {
    expect(availabilityLabelFromDto(base(), "en")).toBe("Ready for duty");
    expect(
      availabilityLabelFromDto(base({ dutyStatus: "open" }), "en")
    ).toBe("On duty");
    expect(
      availabilityLabelFromDto(base({ dutyStatus: "suspended" }), "en")
    ).toBe("Duty paused");
    expect(
      availabilityLabelFromDto(base({ catalogStatus: "inactive" }), "en")
    ).toBe("Not available");
  });

  it("builds list row without inventing fields", () => {
    const row = toRegisterListRowVm(
      base({
        dutyStatus: "open",
        assignedOperatorUserId: 7,
        deviceId: "dev_1",
      }),
      "en"
    );
    expect(row.operatorLabel).toBe("7");
    expect(row.deviceLabel).toBe("dev_1");
    expect(row.dutyLabel).toBe("Open");
  });
});
