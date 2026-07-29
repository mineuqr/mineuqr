/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1
 * Shared Commercial Catalog Platform SSOT (contracts + ownership).
 */

export const COMMERCIAL_CATALOG_FOUNDATION_PROGRAM =
  "COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1" as const;

export const COMMERCIAL_CATALOG_ARCHITECTURE_PROGRAM =
  "COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1" as const;

export const COMMERCIAL_CATALOG_ADR = "ADR-ARCH-037" as const;

export * from "./ownership";
export * from "./dashboard";
export * from "./adoption";
export * from "./types";
export * from "./contracts";
export * from "./localization";
