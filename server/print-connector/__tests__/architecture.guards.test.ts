import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createAllPlatformAdapters } from "../platform/createPlatformAdapter";
import { createTransportAdapters } from "../transport/TransportAdapters";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("PRINT-CONNECTOR-1 architecture guards", () => {
  it("provides platform adapters for all target platforms", () => {
    const adapters = createAllPlatformAdapters();
    expect(adapters.map((a) => a.platform).sort()).toEqual(["android", "linux", "macos", "windows"]);
  });

  it("provides transport adapters for all target transports", () => {
    const transports = createTransportAdapters().map((t) => t.transport).sort();
    expect(transports).toEqual(["bluetooth", "ethernet", "usb", "wifi"]);
  });

  it("does not import order or workspace business logic", () => {
    const runtimeSource = readFileSync(join(root, "runtime", "PrintConnectorRuntime.ts"), "utf8");
    expect(runtimeSource).not.toContain("OrderRepository");
    expect(runtimeSource).not.toContain("PrintingService");
    expect(runtimeSource).not.toContain("order_read_");
    expect(runtimeSource).toContain("DeploymentRuntime");
    expect(runtimeSource).not.toContain("createPlatformAdapter");
  });

  it("selects deployment in composition root only", () => {
    const compositionSource = readFileSync(join(root, "printConnectorComposition.ts"), "utf8");
    expect(compositionSource).toContain("bootstrapPrintConnector");
    expect(compositionSource).not.toContain("createPlatformAdapter");
  });

  it("printing service depends only on PrintConnectorPort", () => {
    const source = readFileSync(
      join(root, "..", "printing", "application", "PrintingService.ts"),
      "utf8"
    );
    expect(source).toContain("PrintConnectorPort");
    expect(source).not.toMatch(/WindowsPlatformAdapter|UsbTransportAdapter/);
  });
});
