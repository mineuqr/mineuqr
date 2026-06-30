import { describe, expect, it, vi, beforeEach } from "vitest";
import { WindowsPlatformAdapter } from "../WindowsPlatformAdapter";
import { parseDiscoverStdout } from "../windowsPrinterDiscovery";
import {
  decodeWindowsPrinterId,
  encodeWindowsPrinterId,
  isSimulatedPrinterId,
} from "../windowsPrinterId";
import { PRINT_PAYLOAD_SCHEMA_VERSION } from "../../../../printing/domain/PrintPayload";

describe("windowsPrinterId", () => {
  it("round-trips printer names", () => {
    const id = encodeWindowsPrinterId("EPSON TM-T88");
    expect(decodeWindowsPrinterId(id)).toBe("EPSON TM-T88");
    expect(isSimulatedPrinterId(id)).toBe(false);
  });

  it("detects simulated ids", () => {
    expect(isSimulatedPrinterId("windows-usb-sim-01")).toBe(true);
  });
});

describe("parseDiscoverStdout", () => {
  it("parses array and single-object JSON", () => {
    const array = parseDiscoverStdout(
      JSON.stringify([{ Name: "Office", PrinterStatus: 0, DriverName: "USB", IsDefault: true }])
    );
    expect(array).toHaveLength(1);
    expect(array[0]?.id).toBe("win-Office");

    const single = parseDiscoverStdout(
      JSON.stringify({ Name: "Kitchen", PrinterStatus: 3, DriverName: "Ethernet", IsDefault: false })
    );
    expect(single[0]?.name).toBe("Kitchen");
    expect(single[0]?.isOnline).toBe(true);
  });

  it("returns empty list for empty stdout", () => {
    expect(parseDiscoverStdout("")).toEqual([]);
    expect(parseDiscoverStdout("[]")).toEqual([]);
  });
});

describe("WindowsPlatformAdapter", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup, NODE_ENV: "production" };
    delete process.env.PRINT_CONNECTOR_MODE;
  });

  it("rejects simulated printer ids at print time", async () => {
    const adapter = new WindowsPlatformAdapter();
    vi.spyOn(adapter, "discoverPrinters").mockResolvedValue([
      {
        id: "windows-usb-sim-01",
        name: "Simulated USB Printer",
        platform: "windows",
        transport: "usb",
        isDefault: true,
        isOnline: true,
        location: "simulated",
        manufacturer: "MineuQR",
      },
    ]);

    const result = await adapter.deliverPrint({
      executionId: "e1",
      restaurantId: 1,
      printJobId: 0,
      orderId: 0,
      printerId: "windows-usb-sim-01",
      payload: {
        schemaVersion: PRINT_PAYLOAD_SCHEMA_VERSION,
        restaurantId: 1,
        orderId: 0,
        orderNumber: "T",
        orderStatus: "ready",
        tableNumber: 1,
        totalAmount: "0",
        createdAt: new Date().toISOString(),
        lineItems: [],
        requestedAt: new Date().toISOString(),
        trigger: { source: "operator", reason: "test" },
      },
      requestedAt: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("unsupported_capability");
    expect(result.message).toBe("Printer does not support the requested capability");
  });
});
