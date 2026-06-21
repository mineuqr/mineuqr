/**
 * THERMAL-PRINTING-10C / WINDOWS-USB-2 — USB device path client abstraction.
 */
import type { DevicePathWriteOptions } from "./devicePathWriter";
import { MemoryDevicePathWriter, writeBytesToDevicePath } from "./devicePathWriter";

export type UsbDeviceConnectOptions = {
  devicePath: string;
  timeoutMs?: number;
};

export interface DevicePathUsbClient {
  write(options: DevicePathWriteOptions): Promise<void>;
}

/** @deprecated Use DevicePathUsbClient */
export type UsbDeviceClient = DevicePathUsbClient;

export class NodeUsbDeviceClient implements DevicePathUsbClient {
  async write(options: DevicePathWriteOptions): Promise<void> {
    await writeBytesToDevicePath(options);
  }
}

export class MemoryUsbDeviceClient implements DevicePathUsbClient {
  readonly writer = new MemoryDevicePathWriter();

  async write(options: DevicePathWriteOptions): Promise<void> {
    await this.writer.write(options);
  }
}
