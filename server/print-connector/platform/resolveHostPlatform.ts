import type { PlatformType } from "../domain/PlatformType";
import { isPlatformType } from "../domain/PlatformType";

export function resolveHostPlatformType(): PlatformType {
  const override = process.env.PRINT_CONNECTOR_PLATFORM;
  if (override && isPlatformType(override)) return override;

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

export function shouldUseSimulatedConnector(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.PRINT_CONNECTOR_MODE === "simulated"
  );
}
