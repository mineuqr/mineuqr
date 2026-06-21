import { describe, expect, it } from "vitest";
import {
  normalizeUsbTransportEndpoint,
  type UsbTransportEndpoint,
} from "../../shared/printing/transports/usbTransportEndpoint";

describe("usbTransportEndpoint THERMAL-PRINTING-WINDOWS-USB-2", () => {
  it("A — endpoint model backward compatibility normalizes legacy devicePath", () => {
    const legacy: UsbTransportEndpoint = { devicePath: "\\\\.\\COM3" };
    expect(normalizeUsbTransportEndpoint(legacy)).toEqual({
      kind: "device-path",
      devicePath: "\\\\.\\COM3",
    });
  });

  it("C — windows spooler endpoint parsing preserves printer and port", () => {
    expect(
      normalizeUsbTransportEndpoint({
        kind: "windows-spooler",
        printerName: "POS-80C",
        portName: "USB001",
      })
    ).toEqual({
      kind: "windows-spooler",
      printerName: "POS-80C",
      portName: "USB001",
    });
  });

  it("normalizes explicit device-path kind", () => {
    expect(
      normalizeUsbTransportEndpoint({
        kind: "device-path",
        devicePath: "\\\\.\\COM4",
      })
    ).toEqual({
      kind: "device-path",
      devicePath: "\\\\.\\COM4",
    });
  });
});
