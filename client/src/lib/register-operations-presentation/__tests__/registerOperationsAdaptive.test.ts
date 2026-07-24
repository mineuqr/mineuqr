/**
 * REGISTER-OPERATIONS-SIMPLIFICATION-1
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  parseUserAgentFriendly,
  presentFriendlyDevice,
  presentFriendlyOperator,
  resolvePrimaryDutyAction,
  resolveRegisterOpsLayoutMode,
  selectActiveRegisters,
} from "../registerOperationsAdaptive";
import type { RegisterDto } from "../registerOperationsApiTypes";

function reg(over: Partial<RegisterDto> = {}): RegisterDto {
  return {
    registerId: "reg_1",
    restaurantId: 1,
    code: "A",
    displayName: "Front",
    registerType: "counter",
    catalogStatus: "active",
    dutyStatus: "closed",
    archivedAt: null,
    deviceId: null,
    assignedOperatorUserId: null,
    operatorAssignedAt: null,
    version: 1,
    updatedAt: "t1",
    ...over,
  };
}

describe("registerOperationsAdaptive", () => {
  it("selects simple layout for exactly one active register", () => {
    expect(
      resolveRegisterOpsLayoutMode([
        reg(),
        reg({
          registerId: "reg_2",
          catalogStatus: "provisioned",
          code: "B",
        }),
      ])
    ).toBe("simple");
    expect(selectActiveRegisters([reg(), reg({ catalogStatus: "inactive" })])).toHaveLength(
      1
    );
  });

  it("selects advanced layout for multiple active registers", () => {
    expect(
      resolveRegisterOpsLayoutMode([
        reg({ registerId: "a", code: "A" }),
        reg({ registerId: "b", code: "B" }),
      ])
    ).toBe("advanced");
  });

  it("resolves adaptive primary actions by duty state", () => {
    expect(
      resolvePrimaryDutyAction({
        catalogStatus: "active",
        dutyStatus: "closed",
      })
    ).toBe("open");
    expect(
      resolvePrimaryDutyAction({
        catalogStatus: "active",
        dutyStatus: "open",
      })
    ).toBe("close");
    expect(
      resolvePrimaryDutyAction({
        catalogStatus: "active",
        dutyStatus: "suspended",
      })
    ).toBe("resume");
    expect(
      resolvePrimaryDutyAction({
        catalogStatus: "provisioned",
        dutyStatus: "closed",
      })
    ).toBeNull();
  });

  it("presents operator without exposing internal ids", () => {
    const follows = presentFriendlyOperator({
      assignedOperatorUserId: null,
      currentUserId: 9,
      currentUserName: "سارة",
      currentUserRole: "user",
      language: "ar",
    });
    expect(follows.title).toBe("يعتمد على المستخدم الحالي");
    expect(JSON.stringify(follows)).not.toMatch(/\b9\b/);

    const self = presentFriendlyOperator({
      assignedOperatorUserId: 9,
      currentUserId: 9,
      currentUserName: "Sara",
      currentUserRole: "admin",
      language: "en",
    });
    expect(self.title).toBe("Sara");
    expect(self.subtitle).toBe("Admin");

    const other = presentFriendlyOperator({
      assignedOperatorUserId: 44,
      currentUserId: 9,
      currentUserName: "Sara",
      currentUserRole: "user",
      language: "en",
    });
    expect(other.title).toBe("Assigned operator");
    expect(JSON.stringify(other)).not.toContain("44");
  });

  it("presents this device without device id", () => {
    const unbound = presentFriendlyDevice({
      deviceId: null,
      language: "ar",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
    });
    expect(unbound.title).toBe("هذا الجهاز");
    expect(unbound.subtitle).toContain("Chrome");
    expect(unbound.subtitle).toContain("Windows");

    const bound = presentFriendlyDevice({
      deviceId: "dev_secret_abc",
      language: "en",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1.15",
    });
    expect(bound.title).toBe("Current device");
    expect(JSON.stringify(bound)).not.toContain("dev_secret");
  });

  it("parses user agent for friendly platform/browser", () => {
    expect(parseUserAgentFriendly("Firefox/120.0 Macintosh").browser).toBe(
      "Firefox"
    );
    expect(parseUserAgentFriendly("Firefox/120.0 Macintosh").platform).toBe(
      "macOS"
    );
  });
});
