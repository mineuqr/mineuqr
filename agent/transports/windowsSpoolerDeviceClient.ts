/**
 * THERMAL-PRINTING-WINDOWS-USB-2 — Windows RAW spooler device client.
 */
import { execFile } from "node:child_process";
import { mkdtemp, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type WindowsSpoolerWriteOptions = {
  printerName: string;
  portName?: string;
  bytes: Uint8Array;
  timeoutMs?: number;
};

export class WindowsSpoolerDeviceClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WindowsSpoolerDeviceClientError";
  }
}

export interface WindowsSpoolerDeviceClient {
  write(options: WindowsSpoolerWriteOptions): Promise<void>;
}

const moduleDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SPOOLER_SCRIPT = join(moduleDir, "windowsSpoolerRawPrint.ps1");

async function writeTempBytes(bytes: Uint8Array): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mineuqr-spooler-"));
  const filePath = join(dir, "payload.bin");
  await writeFile(filePath, bytes);
  return filePath;
}

export class NodeWindowsSpoolerDeviceClient implements WindowsSpoolerDeviceClient {
  constructor(
    private readonly scriptPath: string = DEFAULT_SPOOLER_SCRIPT,
    private readonly powershellPath = "powershell.exe"
  ) {}

  async write(options: WindowsSpoolerWriteOptions): Promise<void> {
    const timeoutMs = options.timeoutMs ?? 5_000;
    const bytesFilePath = await writeTempBytes(options.bytes);

    try {
      const args = [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        this.scriptPath,
        "-PrinterName",
        options.printerName,
        "-BytesFilePath",
        bytesFilePath,
        "-TimeoutSec",
        String(Math.max(1, Math.ceil(timeoutMs / 1_000))),
      ];

      if (options.portName) {
        args.push("-PortName", options.portName);
      }

      await Promise.race([
        execFileAsync(this.powershellPath, args, {
          windowsHide: true,
          maxBuffer: 1024 * 1024,
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new WindowsSpoolerDeviceClientError(
                `Windows spooler write timed out after ${timeoutMs}ms`
              )
            );
          }, timeoutMs);
        }),
      ]);
    } catch (error) {
      throw normalizeSpoolerError(error);
    } finally {
      await unlink(bytesFilePath).catch(() => undefined);
    }
  }
}

export class MemoryWindowsSpoolerDeviceClient implements WindowsSpoolerDeviceClient {
  readonly writes: Array<{
    printerName: string;
    portName?: string;
    bytes: Uint8Array;
  }> = [];
  private readonly printerPorts = new Map<string, string>();
  private readonly failures = new Map<string, Error>();

  registerPrinterPort(printerName: string, portName: string): void {
    this.printerPorts.set(printerName, portName);
  }

  failPrinter(printerName: string, error: Error): void {
    this.failures.set(printerName, error);
  }

  async write(options: WindowsSpoolerWriteOptions): Promise<void> {
    const failure = this.failures.get(options.printerName);
    if (failure) {
      throw failure;
    }

    if (options.portName) {
      const actualPort = this.printerPorts.get(options.printerName);
      if (!actualPort) {
        throw new WindowsSpoolerDeviceClientError(
          `Printer not found: ${options.printerName}`
        );
      }
      if (actualPort !== options.portName) {
        throw new WindowsSpoolerDeviceClientError(
          `Printer port mismatch: expected ${options.portName} but found ${actualPort}`
        );
      }
    } else if (
      options.printerName &&
      this.printerPorts.size > 0 &&
      !this.printerPorts.has(options.printerName)
    ) {
      throw new WindowsSpoolerDeviceClientError(
        `Printer not found: ${options.printerName}`
      );
    }

    this.writes.push({
      printerName: options.printerName,
      portName: options.portName,
      bytes: options.bytes,
    });
  }
}

function normalizeSpoolerError(error: unknown): WindowsSpoolerDeviceClientError {
  if (error instanceof WindowsSpoolerDeviceClientError) {
    return error;
  }

  const execError = error as NodeJS.ErrnoException & {
    stderr?: string | Buffer;
    stdout?: string | Buffer;
  };
  const stderr =
    typeof execError.stderr === "string"
      ? execError.stderr
      : execError.stderr?.toString() ?? "";
  const stdout =
    typeof execError.stdout === "string"
      ? execError.stdout
      : execError.stdout?.toString() ?? "";
  const message = [execError.message, stderr, stdout]
    .filter((part) => part.trim().length > 0)
    .join(" ")
    .trim();

  if (/not found/i.test(message) || /OpenPrinter failed/i.test(message)) {
    return new WindowsSpoolerDeviceClientError(
      message.includes("Printer not found")
        ? message
        : `Printer not found: ${message}`
    );
  }
  if (/WritePrinter failed/i.test(message) || /incomplete byte count/i.test(message)) {
    return new WindowsSpoolerDeviceClientError(`WritePrinter failed: ${message}`);
  }
  if (/timed out/i.test(message)) {
    return new WindowsSpoolerDeviceClientError(message);
  }
  if (/spooler/i.test(message)) {
    return new WindowsSpoolerDeviceClientError(`Spooler unavailable: ${message}`);
  }

  return new WindowsSpoolerDeviceClientError(message || "Windows spooler write failed");
}
