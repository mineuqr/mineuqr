/**
 * OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1 — provider + registry tests.
 */
import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_DOCUMENT_IDENTITY_REGISTRY,
  assertOperationalDocumentRegistered,
  formatOperationalIdentity,
  isPersistenceIdentityLeak,
  isValidOperationalIdentityFormat,
  listOperationalDocumentTypes,
  resolveCheckOperationalIdentity,
  resolveReceiptOperationalIdentity,
  resolveSessionOperationalIdentity,
  resolveRefundOperationalIdentity,
  resolveSettlementOperationalIdentity,
  resolveTableOperationalIdentity,
  parseRefundOperationalIdentity,
  parseLedgerDocumentSearch,
} from "../index";

describe("Operational Identity Registry", () => {
  it("registers every mandated document type", () => {
    const types = listOperationalDocumentTypes();
    expect(types).toEqual(
      expect.arrayContaining([
        "order_kiosk",
        "order_qr",
        "order_waiter",
        "table",
        "session",
        "check",
        "settlement",
        "refund",
        "receipt",
        "kitchen_ticket",
      ])
    );
    expect(OPERATIONAL_DOCUMENT_IDENTITY_REGISTRY.settlement.prefix).toBe("ST");
    expect(OPERATIONAL_DOCUMENT_IDENTITY_REGISTRY.settlement.digits).toBe(6);
    expect(OPERATIONAL_DOCUMENT_IDENTITY_REGISTRY.refund.prefix).toBe("RF");
    expect(OPERATIONAL_DOCUMENT_IDENTITY_REGISTRY.refund.digits).toBe(6);
    expect(OPERATIONAL_DOCUMENT_IDENTITY_REGISTRY.receipt.aliasesTo).toBe(
      "settlement"
    );
  });

  it("rejects unregistered document types (AG-7)", () => {
    expect(() => assertOperationalDocumentRegistered("invoice_erp")).toThrow(
      /AG-7/
    );
  });
});

describe("Operational Identity Provider", () => {
  it("formats Settlement as ST-000001 without persistence leaks", () => {
    const id = resolveSettlementOperationalIdentity({
      checkId: 1,
      settlementRecordId: "sr:720007:1:settlement:1",
    });
    expect(id).toBe("ST-000001");
    expect(isPersistenceIdentityLeak(id)).toBe(false);
    expect(isValidOperationalIdentityFormat("settlement", id)).toBe(true);
  });

  it("receipt resolves to Settlement Reference", () => {
    expect(
      resolveReceiptOperationalIdentity({
        checkId: 360004,
        settlementRecordId: "sr:1:360004:settlement:1",
      })
    ).toBe("ST-360004");
  });

  it("formats Session / Check / Table / Order prefixes per registry", () => {
    expect(resolveSessionOperationalIdentity(42)).toBe("S-000042");
    expect(resolveCheckOperationalIdentity(99)).toBe("C-000099");
    expect(resolveTableOperationalIdentity(7)).toBe("T-0007");
    expect(
      formatOperationalIdentity({ documentType: "order_kiosk", sequence: 12 })
    ).toBe("K-000012");
    expect(
      formatOperationalIdentity({ documentType: "order_qr", sequence: 3 })
    ).toBe("Q-000003");
    expect(
      formatOperationalIdentity({ documentType: "order_waiter", sequence: 8 })
    ).toBe("WT-000008");
  });

  it("detects persistence identity leaks", () => {
    expect(isPersistenceIdentityLeak("sr:1:2:settlement:1")).toBe(true);
    expect(isPersistenceIdentityLeak("fin:check:1:gen:1")).toBe(true);
    expect(isPersistenceIdentityLeak("ST-000001")).toBe(false);
  });

  it("formats Refund as independent RF sequence (not ST / check-derived)", () => {
    expect(resolveRefundOperationalIdentity({ sequence: 1 })).toBe("RF-000001");
    expect(resolveRefundOperationalIdentity({ sequence: 570001 })).toBe(
      "RF-570001"
    );
    expect(
      resolveSettlementOperationalIdentity({
        checkId: 570004,
        recordGeneration: 2,
      })
    ).toBe("ST-570004");
    expect(isValidOperationalIdentityFormat("refund", "RF-000001")).toBe(true);
  });

  it("parses RF and ledger search tokens", () => {
    expect(parseRefundOperationalIdentity("RF-570001")?.sequence).toBe(570001);
    expect(parseLedgerDocumentSearch("RF-000002")).toEqual({
      kind: "refund",
      sequence: 2,
      refundNumber: "RF-000002",
    });
    expect(parseLedgerDocumentSearch("ST-000010")).toEqual({
      kind: "settlement",
      checkId: 10,
      settlementNumber: "ST-000010",
    });
    expect(parseLedgerDocumentSearch("570004")).toEqual({
      kind: "check",
      checkId: 570004,
    });
  });
});
