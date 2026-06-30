import type { PlatformType } from "../domain/PlatformType";
import { isPlatformType } from "../domain/PlatformType";

function resolvePlatformFromProcess(): PlatformType {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    case "android":
      return "android";
    case "linux":
    default:
      return "linux";
  }
}

/**
 * Host OS platform. Ignores PRINT_CONNECTOR_PLATFORM override.
 */
export function resolveHostPlatformType(): PlatformType {
  const host = resolvePlatformFromProcess();
  const override = process.env.PRINT_CONNECTOR_PLATFORM;

  if (!override || !isPlatformType(override)) {
    return host;
  }

  if (override !== host && !shouldUseSimulatedConnector()) {
    console.warn(
      `[print-connector] Ignoring PRINT_CONNECTOR_PLATFORM=${override} on host ${host}; using native platform adapter`
    );
    return host;
  }

  return override;
}

export function shouldUseSimulatedConnector(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.PRINT_CONNECTOR_MODE === "simulated"
  );
}

export function getHostProcessPlatform(): string {
  return process.platform;
}
