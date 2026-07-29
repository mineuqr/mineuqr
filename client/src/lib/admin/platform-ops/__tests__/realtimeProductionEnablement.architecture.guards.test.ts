/**
 * REALTIME-PRODUCTION-ENABLEMENT-1 — presentation + alert semantics guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mapRealtimePresentationToOpsHealth,
  presentRealtimeOpsAlerts,
  resolveRealtimePlatformPresentationState,
} from "@/lib/admin/platform-ops/realtimePlatformPresentation";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("REALTIME-PRODUCTION-ENABLEMENT-1", () => {
  it("maps disabled-by-config distinctly from unavailable", () => {
    expect(
      resolveRealtimePlatformPresentationState({
        platformEnabled: false,
        overallHealth: "unavailable",
      })
    ).toBe("disabled_by_configuration");
    expect(
      resolveRealtimePlatformPresentationState({
        platformEnabled: true,
        overallHealth: "unavailable",
      })
    ).toBe("unavailable");
    expect(
      mapRealtimePresentationToOpsHealth("disabled_by_configuration")
    ).toBe("unknown");
    expect(mapRealtimePresentationToOpsHealth("unavailable")).toBe(
      "unavailable"
    );
  });

  it("presents disabled as informational and gateway failure as critical", () => {
    const disabled = presentRealtimeOpsAlerts(
      [
        {
          id: "gateway_unavailable",
          severity: "critical",
          title: "Realtime gateway unavailable",
          detail: "platform_disabled",
        },
      ],
      false
    );
    expect(disabled).toEqual([
      expect.objectContaining({
        id: "platform_disabled",
        severity: "info",
        title: "Realtime Platform Disabled",
      }),
    ]);

    const fail = presentRealtimeOpsAlerts(
      [
        {
          id: "gateway_unavailable",
          severity: "critical",
          title: "x",
          detail: "gateway_shutdown",
        },
      ],
      true
    );
    expect(fail[0]).toMatchObject({
      id: "gateway_unavailable",
      severity: "critical",
      title: "Realtime Gateway Unavailable",
    });
  });

  it("alert evaluator separates disabled vs gateway failure", () => {
    const alerts = read(
      "server/realtime-platform/observability/realtimeAlerts.ts"
    );
    expect(alerts).toContain('id: "platform_disabled"');
    expect(alerts).toContain('severity: "info"');
    expect(alerts).toContain("Realtime Platform Disabled");
    expect(alerts).toContain("Realtime Gateway Unavailable");
    expect(alerts).not.toContain(
      "input.gatewayUnavailable || !input.platformEnabled"
    );
  });

  it("dashboard does not equate disable with gatewayUnavailable", () => {
    const dash = read(
      "server/realtime-platform/observability/realtimeDashboard.ts"
    );
    expect(dash).not.toContain("gatewayUnavailable: !enabled");
    const router = read("server/realtime-platform/realtimePlatformRouter.ts");
    expect(router).not.toContain(
      "gatewayUnavailable: !isRealtimePlatformEnabled()"
    );
  });

  it("Realtime Ops composition uses presentation helper", () => {
    const src = read(
      "client/src/components/admin/platform-ops/PlatformOpsRealtimeComposition.tsx"
    );
    expect(src).toContain("resolveRealtimePlatformPresentationState");
    expect(src).toContain("presentRealtimeOpsAlerts");
    expect(src).toContain("disabledTitle");
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/REALTIME-PRODUCTION-ENABLEMENT-1";
    expect(existsSync(resolve(root, `${base}/IMPLEMENTATION.md`))).toBe(true);
    expect(existsSync(resolve(root, `${base}/FINAL-REPORT.md`))).toBe(true);
  });
});
