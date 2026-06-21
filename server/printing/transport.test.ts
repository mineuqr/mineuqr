import { beforeEach, describe, expect, it, vi } from "vitest";
import { NullPrintTransport } from "./nullTransport";
import {
  clearRegisteredTransports,
  getTransport,
  listRegisteredTransportIds,
  registerDefaultTransports,
  registerTransport,
} from "./transportRegistry";
import { NULL_PRINT_TRANSPORT_ID, type PrintTransport } from "./transportTypes";

describe("transportRegistry THERMAL-PRINTING-5A", () => {
  beforeEach(() => {
    clearRegisteredTransports();
    registerDefaultTransports();
  });

  it("registers and resolves transports by id", () => {
    const custom: PrintTransport = {
      transportId: "custom-test",
      send: vi.fn(async () => ({
        success: true,
        transportId: "custom-test",
      })),
    };

    registerTransport(custom);

    expect(getTransport("custom-test")).toBe(custom);
    expect(listRegisteredTransportIds()).toContain("custom-test");
    expect(listRegisteredTransportIds()).toContain(NULL_PRINT_TRANSPORT_ID);
    expect(listRegisteredTransportIds()).toContain("browser-bridge");
  });

  it("returns undefined for unknown transport ids", () => {
    expect(getTransport("missing-transport")).toBeUndefined();
  });
});

describe("NullPrintTransport THERMAL-PRINTING-5A", () => {
  it("accepts payload and returns success without external communication", async () => {
    const transport = new NullPrintTransport();
    const payload = Uint8Array.from([0x1b, 0x40, 0x0a]);

    const result = await transport.send(payload, {
      restaurantId: 1,
      printJobId: 100,
    });

    expect(result).toEqual({
      success: true,
      transportId: "null",
      metadata: {
        byteLength: 3,
        restaurantId: 1,
        printJobId: 100,
      },
    });
  });

  it("resolves null transport from registry", async () => {
    const transport = getTransport("null");
    expect(transport).toBeDefined();

    const bytes = Uint8Array.from([27, 100, 2]);
    const result = await transport!.send(bytes, {
      restaurantId: 1,
      printJobId: 100,
    });

    expect(result).toEqual({
      success: true,
      transportId: "null",
      metadata: {
        byteLength: 3,
        restaurantId: 1,
        printJobId: 100,
      },
    });
  });

  it("passes payload byte length through metadata only", async () => {
    const transport = new NullPrintTransport();
    const payload = Uint8Array.from([1, 2, 3, 4, 5]);

    const result = await transport.send(payload, {
      restaurantId: 9,
      printJobId: 42,
    });

    expect(result.metadata?.byteLength).toBe(5);
    expect(result.metadata).not.toHaveProperty("payload");
  });
});
