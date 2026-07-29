/**
 * REACT-130-REALTIME-FORENSICS-1 — runtime typeof + render evidence.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import * as PlatformOpsUi from "@/design-system/platform-ops-ui";
import {
  normalizePlatformOpsHealth,
  PlatformOpsAlert,
  PlatformOpsAlertList,
  PlatformOpsDataTable,
  PlatformOpsEmptyState,
  PlatformOpsErrorState,
  PlatformOpsHeroSummary,
  PlatformOpsLoadingState,
  PlatformOpsMetricCard,
  PlatformOpsMetricGrid,
  PlatformOpsSection,
  PlatformOpsStatusBadge,
  PlatformOpsTableBody,
  PlatformOpsTableCell,
  PlatformOpsTableHead,
  PlatformOpsTableHeader,
  PlatformOpsTableRoot,
  PlatformOpsTableRow,
  PlatformOpsToolbar,
  PLATFORM_OPS_UI,
  PlatformOpsHeader,
} from "@/design-system/platform-ops-ui";
import { PlatformOpsWorkspaceShell } from "@/components/admin/platform-ops/PlatformOpsWorkspaceShell";
import { PlatformOpsRealtimeComposition } from "@/components/admin/platform-ops/PlatformOpsRealtimeComposition";
import { AdminPlatformOpsRealtimePage } from "@/pages/admin/platform-ops/AdminPlatformOpsPages";
import { SemanticKpiCard } from "@/design-system/semantic-card";
import { Activity } from "lucide-react";

const REALTIME_COMPONENTS = {
  PlatformOpsAlert,
  PlatformOpsAlertList,
  PlatformOpsDataTable,
  PlatformOpsEmptyState,
  PlatformOpsErrorState,
  PlatformOpsHeroSummary,
  PlatformOpsLoadingState,
  PlatformOpsMetricCard,
  PlatformOpsMetricGrid,
  PlatformOpsSection,
  PlatformOpsStatusBadge,
  PlatformOpsTableBody,
  PlatformOpsTableCell,
  PlatformOpsTableHead,
  PlatformOpsTableHeader,
  PlatformOpsTableRoot,
  PlatformOpsTableRow,
  PlatformOpsToolbar,
  PlatformOpsHeader,
  PlatformOpsWorkspaceShell,
  PlatformOpsRealtimeComposition,
  AdminPlatformOpsRealtimePage,
} as const;

describe("REACT-130-REALTIME-FORENSICS-1", () => {
  it("every Realtime JSX component import is a function (not undefined)", () => {
    const bad: string[] = [];
    for (const [name, value] of Object.entries(REALTIME_COMPONENTS)) {
      const kind = typeof value;
      if (kind !== "function") {
        bad.push(`${name}=${String(value)} typeof=${kind}`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("barrel named exports used by Realtime resolve", () => {
    const names = [
      "normalizePlatformOpsHealth",
      "PlatformOpsAlert",
      "PlatformOpsAlertList",
      "PlatformOpsDataTable",
      "PlatformOpsEmptyState",
      "PlatformOpsErrorState",
      "PlatformOpsHeroSummary",
      "PlatformOpsLoadingState",
      "PlatformOpsMetricCard",
      "PlatformOpsMetricGrid",
      "PlatformOpsSection",
      "PlatformOpsStatusBadge",
      "PlatformOpsTableBody",
      "PlatformOpsTableCell",
      "PlatformOpsTableHead",
      "PlatformOpsTableHeader",
      "PlatformOpsTableRoot",
      "PlatformOpsTableRow",
      "PlatformOpsToolbar",
      "PLATFORM_OPS_UI",
      "PlatformOpsHeader",
    ] as const;

    const bad: string[] = [];
    for (const name of names) {
      const value = (PlatformOpsUi as Record<string, unknown>)[name];
      if (value == null) bad.push(`${name} is ${String(value)}`);
    }
    expect(bad, bad.join("\n")).toEqual([]);
    expect(typeof normalizePlatformOpsHealth).toBe("function");
    expect(typeof PLATFORM_OPS_UI).toBe("object");
  });

  it("namespace import has no unexpected undefined among PlatformOps* keys", () => {
    const undefinedKeys = Object.keys(PlatformOpsUi)
      .filter((k) => k.startsWith("PlatformOps") || k.startsWith("PlatformOperations"))
      .filter((k) => (PlatformOpsUi as Record<string, unknown>)[k] == null);
    expect(undefinedKeys).toEqual([]);
  });

  it("ROOT CAUSE EVIDENCE: SemanticKpiCard without icon throws invalid element type", () => {
    let message = "";
    try {
      renderToString(
        React.createElement(SemanticKpiCard, {
          label: "health",
          value: "ok",
          tone: "info",
          domain: "information",
        } as never)
      );
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    // React #130 in production; full message in development.
    expect(message.length).toBeGreaterThan(0);
    expect(message).toMatch(/Element type is invalid|undefined|Minified React error #130/i);
  });

  it("SemanticKpiCard with icon renders", () => {
    const html = renderToString(
      React.createElement(SemanticKpiCard, {
        label: "health",
        value: "ok",
        tone: "info",
        domain: "information",
        icon: Activity,
      })
    );
    expect(html).toContain("health");
  });

  it("PlatformOpsMetricCard without icon must not throw after fix", () => {
    const html = renderToString(
      React.createElement(PlatformOpsMetricCard, {
        label: "health",
        value: "ok",
        tone: "info",
        domain: "information",
      } as never)
    );
    expect(html).toContain("health");
  });
});
