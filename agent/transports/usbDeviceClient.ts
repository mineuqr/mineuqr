/**
 * THERMAL-PRINTING-10C — USB device client abstraction.
 */
import type { DevicePathWriteOptions } from "./devicePathWriter";
import { MemoryDevicePathWriter, writeBytesToDevicePath } from "./devicePathWriter";

export type UsbDeviceConnectOptions = {
  devicePath: string;
  timeoutMs?: number;
};

export interface UsbDeviceClient {
  write(options: DevicePathWriteOptions): Promise<void>;
}

export class NodeUsbDeviceClient implements UsbDeviceClient {
  async write(options: DevicePathWriteOptions): Promise<void> {
    await writeBytesToDevicePath(options);
  }
}

export class MemoryUsbDeviceClient implements UsbDeviceClient {
  readonly writer = new MemoryDevicePathWriter();

  async write(options: DevicePathWriteOptions): Promise<void> {
    await this.writer.write(options);
  }
}
