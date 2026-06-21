import { describe, expect, it } from "vitest";
import { EXECUTION_STRATEGY_REASONS } from "../../shared/printing/executionStrategy";
import { getSupportedExecutionMethods } from "./executionCapabilityQueries";
import { canExecuteMethod } from "./executionFeasibilityService";
import {
  getAvailableExecutionStrategies,
  inspectExecutionStrategy,
  supportsExecutionStrategy,
} from "./executionStrategyQueries";
import { resolveExecutionStrategy } from "./executionStrategyResolver";

const escposPrinter = {
  escposCapable: true,
  airprintCapable: false,
  vendorSdkCapable: false,
  transport: "usb" as const,
};

const nonEscposPrinter = {
  escposCapable: false,
  airprintCapable: false,
  vendorSdkCapable: false,
  transport: "network" as const,
};

describe("executionStrategyResolver THERMAL-PRINTING-9B", () => {
  describe("Scenario A — Windows ESC/POS", () => {
    it("resolves raw-escpos for ESC/POS-capable Windows printers", () => {
      const result = resolveExecutionStrategy({
        platform: "windows",
        printer: escposPrinter,
      });

      expect(result).toEqual({
        resolved: true,
        method: "raw-escpos",
        reason: EXECUTION_STRATEGY_REASONS.PLATFORM_ESC_POS_DIRECT,
      });
    });
  });

  describe("Scenario B — Windows non ESC/POS", () => {
    it("resolves spooler for non ESC/POS Windows printers", () => {
      const result = resolveExecutionStrategy({
        platform: "windows",
        printer: nonEscposPrinter,
      });

      expect(result).toEqual({
        resolved: true,
        method: "spooler",
        reason: EXECUTION_STRATEGY_REASONS.PLATFORM_SPOOLER_FALLBACK,
      });
    });
  });

  describe("Scenario C — Android ESC/POS", () => {
    it("resolves raw-escpos for ESC/POS-capable Android printers", () => {
      const result = resolveExecutionStrategy({
        platform: "android",
        printer: { ...escposPrinter, transport: "bluetooth" },
      });

      expect(result).toEqual({
        resolved: true,
        method: "raw-escpos",
        reason: EXECUTION_STRATEGY_REASONS.PLATFORM_ESC_POS_DIRECT,
      });
    });
  });

  describe("Scenario D — iOS AirPrint", () => {
    it("resolves airprint for AirPrint-capable iOS printers", () => {
      const result = resolveExecutionStrategy({
        platform: "ios",
        printer: {
          escposCapable: false,
          airprintCapable: true,
          vendorSdkCapable: false,
          transport: "network",
        },
      });

      expect(result).toEqual({
        resolved: true,
        method: "airprint",
        reason: EXECUTION_STRATEGY_REASONS.IOS_AIRPRINT,
      });
    });
  });

  describe("Scenario E — iOS Vendor SDK", () => {
    it("resolves vendor-sdk for vendor SDK-capable iOS printers", () => {
      const result = resolveExecutionStrategy({
        platform: "ios",
        printer: {
          escposCapable: false,
          airprintCapable: false,
          vendorSdkCapable: true,
          transport: "network",
        },
      });

      expect(result).toEqual({
        resolved: true,
        method: "vendor-sdk",
        reason: EXECUTION_STRATEGY_REASONS.IOS_VENDOR_SDK,
      });
    });
  });

  describe("Scenario F — iOS ESC/POS network printer", () => {
    it("resolves bridge-agent for network ESC/POS iOS printers", () => {
      const result = resolveExecutionStrategy({
        platform: "ios",
        printer: {
          escposCapable: true,
          airprintCapable: false,
          vendorSdkCapable: false,
          transport: "network",
        },
      });

      expect(result).toEqual({
        resolved: true,
        method: "bridge-agent",
        reason: EXECUTION_STRATEGY_REASONS.IOS_BRIDGE_AGENT,
      });
    });
  });

  it("enforces the 9A capability matrix for every resolved strategy", () => {
    const cases = [
      { platform: "windows" as const, printer: escposPrinter },
      { platform: "windows" as const, printer: nonEscposPrinter },
      { platform: "android" as const, printer: escposPrinter },
      {
        platform: "ios" as const,
        printer: {
          escposCapable: false,
          airprintCapable: true,
          vendorSdkCapable: false,
          transport: "network" as const,
        },
      },
      {
        platform: "ios" as const,
        printer: {
          escposCapable: false,
          airprintCapable: false,
          vendorSdkCapable: true,
          transport: "network" as const,
        },
      },
      {
        platform: "ios" as const,
        printer: {
          escposCapable: true,
          airprintCapable: false,
          vendorSdkCapable: false,
          transport: "network" as const,
        },
      },
    ];

    for (const input of cases) {
      const result = resolveExecutionStrategy(input);
      expect(result.resolved).toBe(true);
      if (result.resolved) {
        expect(canExecuteMethod({ platform: input.platform, method: result.method })).toBe(
          true
        );
      }
    }

    expect(canExecuteMethod({ platform: "ios", method: "raw-escpos" })).toBe(false);
  });

  it("rejects unsupported Android non ESC/POS scenarios", () => {
    const result = resolveExecutionStrategy({
      platform: "android",
      printer: nonEscposPrinter,
    });

    expect(result).toEqual({
      resolved: false,
      reason: EXECUTION_STRATEGY_REASONS.UNSUPPORTED_SCENARIO,
      message: expect.stringContaining("android"),
    });
  });

  it("returns deterministic resolution for identical inputs", () => {
    const input = {
      platform: "windows" as const,
      printer: escposPrinter,
    };

    expect(resolveExecutionStrategy(input)).toEqual(resolveExecutionStrategy(input));
  });

  it("returns immutable strategy results", () => {
    const result = resolveExecutionStrategy({
      platform: "windows",
      printer: escposPrinter,
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(() => {
      (result as { method?: string }).method = "spooler";
    }).toThrow();
  });

  it("exposes read-only strategy query helpers", () => {
    const printer = {
      escposCapable: true,
      airprintCapable: false,
      vendorSdkCapable: false,
      transport: "network" as const,
    };

    expect(
      getAvailableExecutionStrategies({ platform: "windows", printer })
    ).toEqual(["raw-escpos"]);
    expect(
      supportsExecutionStrategy({
        platform: "windows",
        method: "raw-escpos",
        printer,
      })
    ).toBe(true);
    expect(
      supportsExecutionStrategy({
        platform: "windows",
        method: "spooler",
        printer,
      })
    ).toBe(false);
    expect(inspectExecutionStrategy({ platform: "windows", printer })).toEqual(
      resolveExecutionStrategy({ platform: "windows", printer })
    );
  });

  it("validates iOS strategy priority across the matrix", () => {
    const airprintPreferred = resolveExecutionStrategy({
      platform: "ios",
      printer: {
        escposCapable: true,
        airprintCapable: true,
        vendorSdkCapable: true,
        transport: "network",
      },
    });

    expect(airprintPreferred).toMatchObject({
      resolved: true,
      method: "airprint",
    });
    expect(getSupportedExecutionMethods("ios")).toEqual([
      "airprint",
      "vendor-sdk",
      "bridge-agent",
    ]);
  });
});
