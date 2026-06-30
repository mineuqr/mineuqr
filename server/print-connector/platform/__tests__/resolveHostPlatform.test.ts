import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  getHostProcessPlatform,
  resolveHostPlatformType,
  shouldUseSimulatedConnector,
} from "../resolveHostPlatform";
import { createPlatformAdapter } from "../createPlatformAdapter";
import { SimulatedPlatformAdapter } from "../SimulatedPlatformAdapter";
import { WindowsPlatformAdapter } from "../windows/WindowsPlatformAdapter";
import { LinuxPlatformAdapter } from "../linux/LinuxPlatformAdapter";

describe("resolveHostPlatformType", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("maps win32 to windows", () => {
    if (process.platform !== "win32") return;
    delete process.env.PRINT_CONNECTOR_PLATFORM;
    expect(resolveHostPlatformType()).toBe("windows");
  });

  it("ignores incompatible PRINT_CONNECTOR_PLATFORM override in production", () => {
    if (process.platform !== "win32") return;
    process.env.NODE_ENV = "production";
    delete process.env.PRINT_CONNECTOR_MODE;
    process.env.PRINT_CONNECTOR_PLATFORM = "linux";
    expect(resolveHostPlatformType()).toBe("windows");
  });

  it("allows override in test mode", () => {
    process.env.NODE_ENV = "test";
    process.env.PRINT_CONNECTOR_PLATFORM = "linux";
    expect(resolveHostPlatformType()).toBe("linux");
  });
});

describe("createPlatformAdapter", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("selects WindowsPlatformAdapter on win32 in production", () => {
    if (process.platform !== "win32") return;
    process.env.NODE_ENV = "production";
    delete process.env.PRINT_CONNECTOR_MODE;
    delete process.env.PRINT_CONNECTOR_PLATFORM;
    const adapter = createPlatformAdapter();
    expect(adapter).toBeInstanceOf(WindowsPlatformAdapter);
    expect(adapter.platform).toBe("windows");
  });

  it("selects SimulatedPlatformAdapter only when simulation mode is enabled", () => {
    process.env.NODE_ENV = "test";
    const adapter = createPlatformAdapter("windows");
    expect(adapter).toBeInstanceOf(SimulatedPlatformAdapter);
    expect(shouldUseSimulatedConnector()).toBe(true);
  });

  it("never selects LinuxPlatformAdapter on win32", () => {
    if (process.platform !== "win32") return;
    process.env.NODE_ENV = "production";
    delete process.env.PRINT_CONNECTOR_MODE;
    process.env.PRINT_CONNECTOR_PLATFORM = "linux";
    const adapter = createPlatformAdapter();
    expect(adapter).not.toBeInstanceOf(LinuxPlatformAdapter);
    expect(adapter.platform).toBe("windows");
  });
});

describe("getHostProcessPlatform", () => {
  it("exposes process.platform", () => {
    expect(getHostProcessPlatform()).toBe(process.platform);
  });
});
