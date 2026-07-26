/**
 * REFUND-DOCUMENT-NUMBERING-ADOPTION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REFUND-DOCUMENT-NUMBERING-ADOPTION-1 architecture guards", () => {
  it("registers RF refund document type and sequence persistence", () => {
    const registry = read("shared/operational-document-identity/registry.ts");
    const sql = read("drizzle/0082_refund_document_numbering.sql");
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(registry).toContain('documentType: "refund"');
    expect(registry).toContain('prefix: "RF"');
    expect(sql).toContain("REFUND-DOCUMENT-NUMBERING-ADOPTION-1");
    expect(sql).toContain("refund_document_numbers");
    expect(integration).toContain("allocateRefundDocumentNumber");
  });

  it("ledger and receipt surface Refund Number distinctly from Settlement", () => {
    const panel = read(
      "client/src/components/settlement-record/SettlementHistoryPanel.tsx"
    );
    const receipt = read(
      "client/src/components/settlement-record/SettlementReceiptDialog.tsx"
    );
    const repo = read(
      "server/operational-session/check/settlementRecordRepository.ts"
    );
    expect(panel).toContain("documentNumber");
    expect(panel).toContain("documentType");
    expect(panel).toContain("originSettlementNumber");
    expect(receipt).toContain("refundReceiptTitle");
    expect(receipt).toContain("documentNumber");
    expect(repo).toContain("parseLedgerDocumentSearch");
  });

  it("does not rewrite Refund Domain / Check money paths for numbering", () => {
    const numbering = read(
      "server/operational-session/check/refundDocumentNumberRepository.ts"
    );
    expect(numbering).not.toContain("executeRefundOnCheck");
    expect(numbering).not.toContain("calculateRefundBudget");
    expect(numbering).not.toContain("computeCheckMoney");
  });
});
