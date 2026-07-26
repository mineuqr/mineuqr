/**
 * OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1 architecture guards", () => {
  it("shared registry + provider exist", () => {
    const registry = read("shared/operational-document-identity/registry.ts");
    const provider = read("shared/operational-document-identity/provider.ts");
    expect(registry).toContain("OPERATIONAL_DOCUMENT_IDENTITY_REGISTRY");
    expect(registry).toContain('prefix: "ST"');
    expect(registry).toContain('prefix: "RF"');
    expect(registry).toContain('documentType: "refund"');
    expect(provider).toContain("resolveSettlementOperationalIdentity");
    expect(provider).toContain("resolveRefundOperationalIdentity");
    expect(provider).toContain("formatOperationalIdentity");
    expect(provider).toContain("isPersistenceIdentityLeak");
  });

  it("Settlement presentation resolves identity via shared provider (OI-08)", () => {
    const vm = read(
      "client/src/lib/settlement-record-presentation/settlementRecordViewModel.ts"
    );
    expect(vm).toContain("resolveSettlementOperationalIdentity");
    expect(vm).toContain("@shared/operational-document-identity");
    const helpers = read(
      "client/src/lib/settlement-record-presentation/settlementHistoryPresentation.ts"
    );
    expect(helpers).toContain("resolveSettlementOperationalIdentity");
    expect(helpers).not.toMatch(/padStart\(6,\s*"0"\)[\s\S]*return `ST-/);
  });

  it("Settlement read API maps operational document numbers via provider", () => {
    const identity = read(
      "server/operational-session/check/api/settlementRecordDocumentIdentity.ts"
    );
    const mapper = read(
      "server/operational-session/check/api/settlementRecordApiMapper.ts"
    );
    expect(identity).toContain("resolveSettlementOperationalIdentity");
    expect(identity).toContain("resolveRefundOperationalIdentity");
    expect(mapper).toContain("resolveSettlementRecordDocumentIdentity");
    expect(mapper).not.toContain(
      "return record.settlementRecordId;\n}"
    );
  });

  it("standard + ADR documents are published", () => {
    const standard = read(
      "docs/architecture/standards/OPERATIONAL-DOCUMENT-IDENTITY-STANDARD.md"
    );
    expect(standard).toContain("OI-01");
    expect(standard).toContain("Operational Identity Provider");
    const adr = read(
      "docs/architecture/adrs/ADR-ARCH-027-operational-document-identity.md"
    );
    expect(adr).toContain("ADR-ARCH-027");
    expect(adr).toContain("OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1");
  });
});
