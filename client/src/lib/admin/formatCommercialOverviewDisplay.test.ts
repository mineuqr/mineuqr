import { describe, expect, it } from "vitest";
import {
  formatCommercialOverviewTimestamp,
  formatMetadataAuthorityValue,
  formatMetadataMetricsSourceValue,
  formatMetadataSchemaVersionValue,
  metadataDisplayFallback,
} from "./formatCommercialOverviewDisplay";

describe("formatCommercialOverviewDisplay (EXEC-7C.3 / AR-UX-8)", () => {
  const iso = "2026-06-08T12:00:00.000Z";

  it("formats ISO timestamps for locale-aware display without raw ISO", () => {
    const en = formatCommercialOverviewTimestamp(iso, "en");
    const ar = formatCommercialOverviewTimestamp(iso, "ar");
    expect(en).toBeTruthy();
    expect(ar).toBeTruthy();
    expect(en).not.toContain("T12:00:00");
    expect(en).not.toContain(".000Z");
  });

  it("returns operator fallback for invalid or missing timestamps", () => {
    expect(formatCommercialOverviewTimestamp("not-a-date", "en")).toBe("Unknown");
    expect(formatCommercialOverviewTimestamp(null, "en")).toBe("Not available");
    expect(formatCommercialOverviewTimestamp("", "ar")).toBe("غير متاح");
    expect(formatCommercialOverviewTimestamp(undefined, "ar")).toBe("غير متاح");
  });

  it("maps known authority and metrics codes to operator labels", () => {
    expect(formatMetadataAuthorityValue("S1_CANONICAL", "en")).toBe(
      "Unified commercial authority"
    );
    expect(formatMetadataMetricsSourceValue("CANONICAL_OWNER", "en")).toBe(
      "Owner subscription records"
    );
    expect(formatMetadataSchemaVersionValue("EXEC-7C.1", "en")).toBe(
      "Commercial overview (v1)"
    );
  });

  it("returns fallback for empty metadata values", () => {
    expect(formatMetadataAuthorityValue(null, "en")).toBe("Not available");
    expect(formatMetadataMetricsSourceValue(undefined, "en")).toBe("Not available");
    expect(formatMetadataSchemaVersionValue("  ", "ar")).toBe("غير متاح");
  });

  it("preserves unknown codes as-is", () => {
    expect(formatMetadataAuthorityValue("FUTURE_SOURCE", "en")).toBe("FUTURE_SOURCE");
  });

  it("metadataDisplayFallback returns locale strings", () => {
    expect(metadataDisplayFallback("en", "unavailable")).toBe("Not available");
    expect(metadataDisplayFallback("en", "unknown")).toBe("Unknown");
    expect(metadataDisplayFallback("ar", "unavailable")).toBe("غير متاح");
    expect(metadataDisplayFallback("ar", "unknown")).toBe("غير معروف");
  });
});
