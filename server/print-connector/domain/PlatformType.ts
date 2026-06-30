export const PLATFORM_TYPES = ["windows", "macos", "linux", "android"] as const;

export type PlatformType = (typeof PLATFORM_TYPES)[number];

export function isPlatformType(value: string): value is PlatformType {
  return (PLATFORM_TYPES as readonly string[]).includes(value);
}
