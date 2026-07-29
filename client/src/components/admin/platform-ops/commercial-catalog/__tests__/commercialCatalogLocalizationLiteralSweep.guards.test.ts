/**
 * COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1 — compliance guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();

describe("COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1", () => {
  it("uses shared useCatalogI18n helper", () => {
    expect(
      existsSync(
        resolve(
          root,
          "client/src/components/admin/platform-ops/commercial-catalog/useCatalogI18n.ts"
        )
      )
    ).toBe(true);
    const panels = readFileSync(
      resolve(
        root,
        "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx"
      ),
      "utf8"
    );
    expect(panels).toContain("useCatalogI18n");
    expect(panels).not.toMatch(/title="[A-Za-z]/);
    expect(panels).not.toMatch(/primaryActionLabel="[A-Za-z]/);
  });

  it("marks literal sweep on composition shell", () => {
    const composition = readFileSync(
      resolve(
        root,
        "client/src/components/admin/platform-ops/PlatformOpsCommercialCatalogComposition.tsx"
      ),
      "utf8"
    );
    expect(composition).toContain(
      "COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1"
    );
    expect(composition).toContain("COMMERCIAL-CATALOG-MANAGEMENT-UI-1");
  });

  it("passes automated literal scan (0 findings)", () => {
    execFileSync(
      process.execPath,
      [
        "docs/engineering/programs/COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1/_scan-literals.mjs",
      ],
      { cwd: root, encoding: "utf8" }
    );
    const findings = JSON.parse(
      readFileSync(
        resolve(
          root,
          "docs/engineering/programs/COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1/_audit/literal-findings.json"
        ),
        "utf8"
      )
    );
    expect(findings).toEqual([]);
  });

  it("passes AR/EN key parity for commercialCatalog", () => {
    const out = execFileSync(
      process.execPath,
      [
        "docs/engineering/programs/COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1/_key-parity.mjs",
      ],
      { cwd: root, encoding: "utf8" }
    );
    const report = JSON.parse(out);
    expect(report.missingInAr).toEqual([]);
    expect(report.missingInEn).toEqual([]);
    expect(report.missingReferenced).toEqual([]);
    expect(report.emptyEn).toEqual([]);
    expect(report.emptyAr).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
