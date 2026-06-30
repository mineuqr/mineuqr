import type { PlatformAdapter } from "../../print-connector/contracts/PlatformAdapter";
import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";
import { WindowsPlatformAdapter } from "../../print-connector/platform/windows/WindowsPlatformAdapter";
import { isRlcWindowsHost } from "../windows/createRlcWindowsConnectorRuntime";

/**
 * Hosts the native Windows PlatformAdapter inside RLC (ADR-ARCH-016 Rule 7/8).
 */
export class PlatformAdapterHost {
  private adapter: PlatformAdapter | null = null;

  initialize(): void {
    if (!isRlcWindowsHost()) {
      this.adapter = null;
      return;
    }
    this.adapter = new WindowsPlatformAdapter();
  }

  getAdapter(): PlatformAdapter | null {
    return this.adapter;
  }

  isAvailable(): boolean {
    return this.adapter != null;
  }

  shutdown(): void {
    this.adapter = null;
  }
}

export type PlatformRuntimeBundle = {
  runtime: PrintConnectorApi;
  platformAdapter: PlatformAdapter;
};
