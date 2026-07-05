import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isBlockedRole } from "../runtimeCapabilities";
import { transition } from "../bootstrapStateMachine";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function walkTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      files.push(...walkTsFiles(full));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      if (entry.name.endsWith(".test.ts")) continue;
      files.push(full);
    }
  }
  return files;
}

describe("OPERATIONAL-SCREEN-CLIENT-1 architecture guards", () => {
  const screenDirs = [
    join(repoRoot, "client/src/pages/screen"),
    join(repoRoot, "client/src/components/operational-screen"),
    join(repoRoot, "client/src/lib/operational-screen"),
  ];

  const screenSources = screenDirs.flatMap((dir) => walkTsFiles(dir)).map((file) => readFileSync(file, "utf8"));

  it("FF-OSC-01: no verifiedProcedure in screen modules", () => {
    for (const source of screenSources) {
      expect(source).not.toContain("verifiedProcedure");
    }
  });

  it("FF-OSC-02: no useAuth in operational screen runtime", () => {
    const runtimeSources = screenSources.filter(
      (source) => !source.includes("architectureGuards.test.ts")
    );
    for (const source of runtimeSources) {
      expect(source).not.toMatch(/\buseAuth\s*\(/);
    }
  });

  it("FF-OSC-03: screen data uses operationalDevice.runtime", () => {
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const print = read("client/src/components/operational-screen/PrintMonitorScreenPanel.tsx");
    expect(kitchen).toContain("operationalDevice.runtime.getKitchenQueue");
    expect(print).toContain("operationalDevice.runtime.getPrintMonitorSummary");
    expect(kitchen).not.toContain("kitchen.read.getQueue");
  });

  it("FF-BOOT-01: bootstrap does not call authenticate on normal boot", () => {
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    expect(orchestrator).not.toContain("authenticate");
    const entry = read("client/src/pages/screen/OperationalScreenEntry.tsx");
    expect(entry).not.toContain("authenticate");
  });

  it("HARDENING-04: role panels consume the runtime provider (no prop-drilling)", () => {
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const print = read("client/src/components/operational-screen/PrintMonitorScreenPanel.tsx");
    const roleRouter = read("client/src/components/operational-screen/RoleRouter.tsx");
    // Panels take no props and read context from the provider hook.
    expect(kitchen).toContain("useRuntimeContext");
    expect(print).toContain("useRuntimeContext");
    expect(kitchen).toContain("export function KitchenScreenPanel()");
    expect(print).toContain("export function PrintMonitorScreenPanel()");
    expect(roleRouter).toContain("useRuntimeContext");
    expect(roleRouter).toContain("<KitchenScreenPanel />");
    expect(roleRouter).toContain("<PrintMonitorScreenPanel />");
  });

  it("HARDENING-03: single canonical runtime authority (no legacy bootstrap hook)", () => {
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    // Exposed context always carries the authoritative phase (no duplicated phase state).
    expect(orchestrator).toContain("bootstrap: { ...context.bootstrap, phase }");
    // Legacy duplicated-state hook must not exist.
    expect(() => read("client/src/lib/operational-screen/useScreenBootstrap.ts")).toThrow();
  });

  it("HARDENING-02: lifecycle changes route through the state machine dispatch", () => {
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    // No direct setPhase outside the dispatch choke point.
    const directSetPhase = orchestrator.match(/setPhase\(/g) ?? [];
    // Exactly one setPhase, inside dispatch().
    expect(directSetPhase.length).toBe(1);
    expect(orchestrator).toContain("transition(current, event)");
  });

  it("FF-PAIR-01: pairing module does not import heartbeat hooks", () => {
    const pairing = read("client/src/components/operational-screen/PairingShell.tsx");
    expect(pairing).not.toContain("heartbeat");
    expect(pairing).not.toContain("getKitchenQueue");
  });

  it("FF-BOOT-05: main.tsx skips login redirect on /screen routes", () => {
    const main = read("client/src/main.tsx");
    expect(main).toContain('startsWith("/screen")');
  });

  it("FF-BOOT-07: unsupported roles reach Blocked Runtime after heartbeat is active", () => {
    expect(isBlockedRole("pickup_display")).toBe(true);
    expect(isBlockedRole("customer_display")).toBe(true);
    expect(isBlockedRole("self_ordering_kiosk")).toBe(true);
    expect(isBlockedRole("kitchen_display")).toBe(false);
    expect(isBlockedRole("expo_display")).toBe(false);
    expect(isBlockedRole("print_monitor")).toBe(false);

    // Running is only reachable after heartbeat is active; blocked follows running.
    const running = transition("heartbeat_active", { type: "HEARTBEAT_STARTED" });
    expect(running).toBe("running");
    const blocked = transition(running, { type: "RUN_BLOCKED" });
    expect(blocked).toBe("blocked");
  });
});
