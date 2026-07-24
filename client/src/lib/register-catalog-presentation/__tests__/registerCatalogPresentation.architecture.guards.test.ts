/**
 * REGISTER-CATALOG-MANAGEMENT-1 — catalog presentation architecture guards.
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
    expect(panel).toContain("REGISTER-CATALOG-MANAGEMENT-1");
    expect(panel).not.toContain("openRegister");
    expect(panel).not.toContain("assignOperator");
    expect(panel).not.toContain("trpc.crmp.register");
    expect(panel).toContain("openOperations");
  });
});
