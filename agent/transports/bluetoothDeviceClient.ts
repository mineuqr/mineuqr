/**
 * THERMAL-PRINTING-10C — Bluetooth device client abstraction.
 */
import type { DevicePathWriteOptions } from "./devicePathWriter";
import { MemoryDevicePathWriter, writeBytesToDevicePath } from "./devicePathWriter";

export interface BluetoothDeviceClient {
  write(options: DevicePathWriteOptions): Promise<void>;
}

export class NodeBluetoothDeviceClient implements BluetoothDeviceClient {
  async write(options: DevicePathWriteOptions): Promise<void> {
    await writeBytesToDevicePath(options);
  }
}

export class MemoryBluetoothDeviceClient implements BluetoothDeviceClient {
  readonly writer = new MemoryDevicePathWriter();

  async write(options: DevicePathWriteOptions): Promise<void> {
    await this.writer.write(options);
  }
}
