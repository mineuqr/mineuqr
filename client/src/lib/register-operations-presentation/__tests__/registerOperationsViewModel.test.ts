/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  availabilityFromCatalogStatus,
  filterRegisterRows,
  shiftBadgeFromRef,
  toRegisterListRowVm,
} from "../registerOperationsViewModel";
import type { RegisterDto } from "../registerOperationsApiTypes";

function base(over: Partial<RegisterDto> = {}): RegisterDto {
  return {
    registerId: "reg_1",
    restaurantId: 1,
    code: "FRONT",
    displayName: "Front",
    registerType: "counter",
    catalogStatus: "active",
    dutyStatus: "closed",
    archivedAt: null,
    deviceId: null,
    assignedOperatorUserId: null,
    operatorAssignedAt: null,
    version: 2,
    updatedAt: "t1",
    ...over,
  };
}

describe("registerOperationsViewModel (UX refinement)", () => {
  it("maps availability from catalogStatus only", () => {
    expect(availabilityFromCatalogStatus("active", "en").tone).toBe("ready");
    expect(availabilityFromCatalogStatus("active", "ar").label).toBe("جاهز");
    expect(availabilityFromCatalogStatus("inactive", "en").tone).toBe(
      "unavailable"
    );
    expect(availabilityFromCatalogStatus("provisioned", "en").label).toBe(
      "Unavailable"
    );
  });

  it("maps shift badge from backend null|presence", () => {
    expect(shiftBadgeFromRef(true, "en").tone).toBe("active");
    expect(shiftBadgeFromRef(false, "ar").label).toBe("لا توجد وردية");
  });

  it("builds searchable list rows without internal ids", () => {
    const row = toRegisterListRowVm(
      base({
        dutyStatus: "open",
        assignedOperatorUserId: 7,
        deviceId: "dev_1",
      }),
      "en"
    );
    expect(row.dutyTone).toBe("open");
    expect(row.operatorLabel).toBe("Assigned operator");
    expect(row.deviceLabel).toBe("Current device");
    expect(row.searchText).toContain("front");
    expect(row.searchText).not.toContain("dev_1");
    expect(row.searchText).not.toContain("7");
  });

  it("filters rows by search text", () => {
    const rows = [
      toRegisterListRowVm(base({ registerId: "reg_a", displayName: "Bar" }), "en"),
      toRegisterListRowVm(
        base({ registerId: "reg_b", displayName: "Drive Thru" }),
        "en"
      ),
    ];
    expect(filterRegisterRows(rows, "drive")).toHaveLength(1);
    expect(filterRegisterRows(rows, "drive")[0]?.registerId).toBe("reg_b");
    expect(filterRegisterRows(rows, "")).toHaveLength(2);
  });
});
