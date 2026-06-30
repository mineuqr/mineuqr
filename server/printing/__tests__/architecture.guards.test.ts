import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("PRINTING-1 architecture guards", () => {
  it("does not implement a print connector beyond the NoOp port", () => {
    const connectorDir = join(root, "infrastructure", "connector");
    const files = ["NoOpPrintConnectorPort.ts"];
    for (const file of files) {
      const source = readFileSync(join(connectorDir, file), "utf8");
      expect(source).not.toMatch(/usb|bluetooth|escpos|pdf|windows|printer\.discover/i);
    }
  });

  it("builds payload from order read projections only", () => {
    const source = readFileSync(
      join(root, "infrastructure", "payload", "OrderReadPrintPayloadBuilder.ts"),
      "utf8"
    );
    expect(source).toContain("orderReadOrders");
    expect(source).toContain("orderReadOrderLineItems");
    expect(source).not.toContain("getOrderById");
  });
});
