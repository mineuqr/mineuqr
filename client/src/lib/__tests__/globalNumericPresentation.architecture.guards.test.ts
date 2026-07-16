import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("GLOBAL-NUMERIC-PRESENTATION-POLICY-1 architecture guards", () => {
  it("publishes platform-wide Western digit helpers in shared utils", () => {
    const shared = read("shared/utils/numericPresentation.ts");
    expect(shared).toContain("GLOBAL-NUMERIC-PRESENTATION-POLICY-1");
    expect(shared).toContain("toWesternDigits");
    expect(shared).toContain('WESTERN_NUMBERING_SYSTEM = "latn"');
    expect(shared).toContain("withWesternDigitsIntlOptions");
    expect(shared).toContain("formatLocaleNumber");
    expect(shared).toContain("formatLocaleDateTime");
  });

  it("defaults restaurant timezone formatters to Western digits", () => {
    const tz = read("shared/utils/timezone.ts");
    expect(tz).toContain('numberingSystem: "latn"');
    expect(tz).toContain("GLOBAL-NUMERIC-PRESENTATION-POLICY-1");
  });

  it("currency and kitchen presentation follow Western digits", () => {
    const currency = read("client/src/lib/currencyLocale.ts");
    const kitchen = read("client/src/lib/kitchen/kitchenPresentation.ts");
    expect(currency).toContain("withWesternDigitsIntlOptions");
    expect(currency).toContain("toWesternDigits");
    expect(kitchen).toContain("Western digits");
    expect(kitchen).not.toContain('ARABIC_DIGITS = ["٠"');
  });

  it("reporting exports consume the shared helper", () => {
    const format = read("client/src/lib/reporting-exports/format.ts");
    expect(format).toContain('@shared/utils/numericPresentation');
    expect(format).toContain("toWesternDigits");
  });

  it("does not redesign domains or reporting contracts", () => {
    const contracts = read("shared/reporting-platform/reportingContracts.ts");
    const routers = read("server/routers.ts");
    expect(contracts).toContain("BusinessMetricsSummary");
    expect(routers).toContain("reporting: reportingRouter");
    expect(contracts).not.toContain("GLOBAL-NUMERIC-PRESENTATION-POLICY-1");
  });
});
