/**
 * THERMAL-PRINTING-10C — device path byte writer (USB / Bluetooth serial paths).
 */
export type DevicePathWriteOptions = {
  devicePath: string;
  bytes: Uint8Array;
  timeoutMs?: number;
};

export class DevicePathWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevicePathWriteError";
  }
}

export async function writeBytesToDevicePath(
  options: DevicePathWriteOptions
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 5_000;

  await Promise.race([
    writeToPath(options.devicePath, options.bytes),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new DevicePathWriteError(`Device write timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

async function writeToPath(devicePath: string, bytes: Uint8Array): Promise<void> {
  const fs = await import("node:fs/promises");
  const handle = await fs.open(devicePath, "w");
  try {
    await handle.write(bytes);
  } finally {
    await handle.close();
  }
}

export class MemoryDevicePathWriter {
  readonly writes: Array<{ devicePath: string; bytes: Uint8Array }> = [];
  private readonly failures = new Map<string, Error>();
  shouldFailConnection = false;

  failPath(devicePath: string, error: Error): void {
    this.failures.set(devicePath, error);
  }

  async write(options: DevicePathWriteOptions): Promise<void> {
    if (this.shouldFailConnection) {
      throw new DevicePathWriteError("Device connection failed");
    }

    const failure = this.failures.get(options.devicePath);
    if (failure) {
      throw failure;
    }

    this.writes.push({
      devicePath: options.devicePath,
      bytes: options.bytes,
    });
  }
}
