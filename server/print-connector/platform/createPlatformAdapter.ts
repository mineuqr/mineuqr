import type { PlatformAdapter } from "../contracts/PlatformAdapter";
import type { PlatformType } from "../domain/PlatformType";
import { AndroidPlatformAdapter } from "./android/AndroidPlatformAdapter";
import { DarwinPlatformAdapter } from "./darwin/DarwinPlatformAdapter";
import { LinuxPlatformAdapter } from "./linux/LinuxPlatformAdapter";
import { resolveHostPlatformType, shouldUseSimulatedConnector } from "./resolveHostPlatform";
import { SimulatedPlatformAdapter } from "./SimulatedPlatformAdapter";
import { WindowsPlatformAdapter } from "./windows/WindowsPlatformAdapter";

export function createPlatformAdapter(platform?: PlatformType): PlatformAdapter {
  const resolved = platform ?? resolveHostPlatformType();

  if (shouldUseSimulatedConnector()) {
    return new SimulatedPlatformAdapter(resolved);
  }

  switch (resolved) {
    case "windows":
      return new WindowsPlatformAdapter();
    case "macos":
      return new DarwinPlatformAdapter();
    case "android":
      return new AndroidPlatformAdapter();
    case "linux":
    default:
      return new LinuxPlatformAdapter();
  }
}

export function createAllPlatformAdapters(): PlatformAdapter[] {
  return [
    new WindowsPlatformAdapter(),
    new DarwinPlatformAdapter(),
    new LinuxPlatformAdapter(),
    new AndroidPlatformAdapter(),
  ];
}
