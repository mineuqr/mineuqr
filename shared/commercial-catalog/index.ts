/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Shared Live Commercial Plans SSOT (contracts + ownership).
 */

export const COMMERCIAL_CATALOG_FOUNDATION_PROGRAM =
  "COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1" as const;

export const COMMERCIAL_CATALOG_ARCHITECTURE_PROGRAM =
  "COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1" as const;

export const COMMERCIAL_LIVE_PLANS_PROGRAM =
  "COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1" as const;

export const COMMERCIAL_CATALOG_ADR = "ADR-ARCH-037" as const;

export * from "./ownership";
export * from "./dashboard";
export * from "./adoption";
export * from "./types";
export * from "./contracts";
export * from "./localization";
export * from "./publishing";
