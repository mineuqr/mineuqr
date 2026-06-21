import { describe, expect, it } from "vitest";
import {
  canExecuteMethod,
} from "./executionFeasibilityService";
import {
  getExecutionCapabilityMatrix,
  getPlatformExecutionCapabilities,
} from "./executionCapabilityMatrix";
import {
  getExecutionPlatformSummary,
  getSupportedExecutionMethods,
  getSupportedTransports,
  supportsEscPos,
  supportsLocalExecution,
} from "./executionCapabilityQueries";
import {
  ANDROID_PLATFORM_PROFILE,
  IOS_PLATFORM_PROFILE,
  WINDOWS_PLATFORM_PROFILE,
} from "./platformProfiles";

describe("executionCapabilityMatrix THERMAL-PRINTING-9A", () => {
  describe("Scenario A — Windows supports raw-escpos", () => {
    it("returns true for raw-escpos on Windows", () => {
      expect(
        canExecuteMethod({ platform: "windows", method: "raw-escpos" })
      ).toBe(true);
    });
  });

  describe("Scenario B — Android supports bluetooth transport", () => {
    it("includes bluetooth in Android supported transports", () => {
      expect(getSupportedTransports("android")).toContain("bluetooth");
    });
  });

  describe("Scenario C — iOS supports airprint", () => {
    it("returns true for airprint on iOS", () => {
      expect(canExecuteMethod({ platform: "ios", method: "airprint" })).toBe(true);
    });
  });

  describe("Scenario D — iOS supports raw-escpos", () => {
    it("returns false for raw-escpos on iOS", () => {
      expect(canExecuteMethod({ platform: "ios", method: "raw-escpos" })).toBe(false);
      expect(supportsEscPos("ios")).toBe(false);
    });
  });

  describe("Scenario E — capability queries", () => {
    it("returns correct transport and method query results", () => {
      expect(getSupportedTransports("windows")).toEqual(["usb", "network"]);
      expect(getSupportedExecutionMethods("windows")).toEqual(["raw-escpos", "spooler"]);
      expect(supportsEscPos("windows")).toBe(true);
      expect(supportsLocalExecution("windows")).toBe(true);

      expect(getSupportedTransports("android")).toEqual(["usb", "bluetooth", "network"]);
      expect(getSupportedExecutionMethods("android")).toEqual(["raw-escpos"]);
      expect(supportsLocalExecution("android")).toBe(true);

      expect(getSupportedTransports("ios")).toEqual(["network"]);
      expect(getSupportedExecutionMethods("ios")).toEqual([
        "airprint",
        "vendor-sdk",
        "bridge-agent",
      ]);
      expect(supportsLocalExecution("ios")).toBe(false);
    });

    it("evaluates method feasibility per platform", () => {
      expect(canExecuteMethod({ platform: "windows", method: "spooler" })).toBe(true);
      expect(canExecuteMethod({ platform: "windows", method: "airprint" })).toBe(false);
      expect(canExecuteMethod({ platform: "android", method: "raw-escpos" })).toBe(true);
      expect(canExecuteMethod({ platform: "android", method: "spooler" })).toBe(false);
    });
  });

  describe("Scenario F — platform summary", () => {
    it("returns accurate matrix information for all platforms", () => {
      expect(getExecutionPlatformSummary()).toEqual([
        {
          platform: "windows",
          transportCount: 2,
          methodCount: 2,
          supportsEscPos: true,
          supportsLocalExecution: true,
        },
        {
          platform: "android",
          transportCount: 3,
          methodCount: 1,
          supportsEscPos: true,
          supportsLocalExecution: true,
        },
        {
          platform: "ios",
          transportCount: 1,
          methodCount: 3,
          supportsEscPos: false,
          supportsLocalExecution: false,
        },
      ]);
    });

    it("returns a single platform summary when requested", () => {
      expect(getExecutionPlatformSummary("ios")).toEqual({
        platform: "ios",
        transportCount: 1,
        methodCount: 3,
        supportsEscPos: false,
        supportsLocalExecution: false,
      });
    });
  });

  it("exposes immutable canonical profiles through the matrix", () => {
    const matrix = getExecutionCapabilityMatrix();

    expect(matrix.windows).toEqual(WINDOWS_PLATFORM_PROFILE);
    expect(matrix.android).toEqual(ANDROID_PLATFORM_PROFILE);
    expect(matrix.ios).toEqual(IOS_PLATFORM_PROFILE);
    expect(getPlatformExecutionCapabilities("windows")).toBe(WINDOWS_PLATFORM_PROFILE);
  });
});
