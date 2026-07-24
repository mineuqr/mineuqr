/**
 * REGISTER-CATALOG-MANAGEMENT-1 / REGISTER-CATALOG-VALIDATION-PRESENTATION-1
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Register Catalog presentation architecture guards", () => {
  it("catalog presentation calls only crmp.catalog.*", () => {
    const q = read(
      "src/lib/register-catalog-presentation/useRegisterCatalogQueries.ts"
    );
    const m = read(
      "src/lib/register-catalog-presentation/useRegisterCatalogMutations.ts"
    );
    expect(q).toContain("trpc.crmp.catalog");
    expect(m).toContain("trpc.crmp.catalog");
    expect(q + m).not.toMatch(/trpc\.crmp\.register\.(open|close|suspend)/);
    expect(q + m).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
  });

  it("catalog panel has no Duty controls", () => {
    const panel = read(
      "src/components/register-catalog/RegisterCatalogPanel.tsx"
    );
    expect(panel).toContain("REGISTER-CATALOG-VALIDATION-PRESENTATION-1");
    expect(panel).not.toContain("openRegister");
    expect(panel).not.toContain("assignOperator");
    expect(panel).not.toContain("trpc.crmp.register");
    expect(panel).toContain("openOperations");
  });

  it("panel never renders raw error.message / Zod dumps", () => {
    const panel = read(
      "src/components/register-catalog/RegisterCatalogPanel.tsx"
    );
    expect(panel).toContain("presentRegisterCatalogError");
    expect(panel).toContain("aria-invalid");
    expect(panel).toContain("aria-describedby");
    expect(panel).toContain("toast.success");
    expect(panel).not.toMatch(/setError\(e instanceof Error \? e\.message/);
    expect(panel).not.toContain("JSON.stringify");
    expect(panel).not.toMatch(/listQuery\.error\.message/);
  });

  it("validation mapper is presentation-only (no domain imports)", () => {
    const mapper = read(
      "src/lib/register-catalog-presentation/registerCatalogValidationPresentation.ts"
    );
    expect(mapper).toContain("REGISTER-CATALOG-VALIDATION-PRESENTATION-1");
    expect(mapper).not.toMatch(/from ["']@shared\/crmp/);
    expect(mapper).not.toContain("provisionRegister");
    expect(mapper).not.toContain("normalizeRegisterCode");
  });
});
