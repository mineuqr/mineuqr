/**
 * THERMAL-PRINTING-9A.2 — canonical platform execution profiles (immutable).
 */
import {
  validatePlatformExecutionCapabilities,
  type PlatformExecutionCapabilities,
} from "../../shared/printing/executionCapabilities";

export const WINDOWS_PLATFORM_PROFILE: PlatformExecutionCapabilities =
  validatePlatformExecutionCapabilities({
    platform: "windows",
    transports: ["usb", "network"],
    methods: ["raw-escpos", "spooler"],
    supportsEscPos: true,
    supportsLocalExecution: true,
  });

export const ANDROID_PLATFORM_PROFILE: PlatformExecutionCapabilities =
  validatePlatformExecutionCapabilities({
    platform: "android",
    transports: ["usb", "bluetooth", "network"],
    methods: ["raw-escpos"],
    supportsEscPos: true,
    supportsLocalExecution: true,
  });

export const IOS_PLATFORM_PROFILE: PlatformExecutionCapabilities =
  validatePlatformExecutionCapabilities({
    platform: "ios",
    transports: ["network"],
    methods: ["airprint", "vendor-sdk", "bridge-agent"],
    supportsEscPos: false,
    supportsLocalExecution: false,
  });

export const PLATFORM_EXECUTION_PROFILES: Readonly<
  Record<PlatformExecutionCapabilities["platform"], PlatformExecutionCapabilities>
> = Object.freeze({
  windows: WINDOWS_PLATFORM_PROFILE,
  android: ANDROID_PLATFORM_PROFILE,
  ios: IOS_PLATFORM_PROFILE,
});
