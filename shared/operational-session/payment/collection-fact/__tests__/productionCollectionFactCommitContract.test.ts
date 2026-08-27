/**
 * PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1 — contract-level validation.
 * Isolated from Cashier, Confirm, Settlement, and production DB writes.
 */
import { describe, expect, it } from "vitest";
import {
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_WAITER_TABLET,
} from "@shared/ordering-platform";
import {
  COLLECTION_FACT_FINALITY,
  COLLECTION_FACT_IDENTITY,
  CollectionFactError,
  PRODUCTION_COLLECTION_FACT_COMMIT_PROGRAM_ID,
  PRODUCTION_COLLECTION_FACT_FAILURE,
  PRODUCTION_COLLECTION_FACT_IDENTITY_RULES,
  PRODUCTION_COLLECTION_FACT_KIND,
  PRODUCTION_COLLECTION_FACT_SNAPSHOT,
  assertProductionCollectionFactCommit,
  collectionFactCommitIsPaid,
  isProductionCollectionFactCommitCommand,
  type CollectionFactCommitContext,
  type CommitCollectionFactCommand,
} from "../index";

const CONTEXT: CollectionFactCommitContext = {
  restaurantId: 7,
  actorAuthorized: true,
  actorUserId: 42,
  actorType: "cashier",
  terminalId: "term-1",
};

function command(
  overrides: Partial<CommitCollectionFactCommand> = {}
): CommitCollectionFactCommand {
  return {
    restaurantId: 7,
    orderId: 1001,
    paymentIntentId: "intent-1001-a",
    orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
    purpose: "production",
    subtotal: "100.00",
    discountAmount: "0.00",
    taxAmount: "15.00",
    amount: "115.00",
    currencyCode: "SAR",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
    },
    taxBreakdown: {
      lines: [
        {
          componentId: "vat",
          name: "VAT",
          ratePercent: "15.00",
          amount: "15.00",
        },
      ],
      totalTaxAmount: "15.00",
    },
    composition: [
      {
        sequence: 1,
        description: "Kabsa",
        netAmount: "100.00",
        taxAmount: "15.00",
        originOrderId: 1001,
      },
    ],
    tenders: [{ paymentMethod: "cash", amount: "115.00" }],
    checkId: null,
    businessDay: "2026-08-20",
    idempotencyKey: "idem-1001-a-0001",
    ...overrides,
  };
}

function expectValidation(run: () => void) {
  try {
    run();
    throw new Error("expected CollectionFactError");
  } catch (error) {
    expect(error).toBeInstanceOf(CollectionFactError);
    expect((error as CollectionFactError).code).toMatch(
      /VALIDATION|TENANT|UNAUTHORIZED/
    );
  }
}

describe("PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1", () => {
  it("defines one channel-independent production contract", () => {
    expect(PRODUCTION_COLLECTION_FACT_COMMIT_PROGRAM_ID).toBe(
      "PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1"
    );
    expect(COLLECTION_FACT_IDENTITY.payment).toBe("paymentIntentId");
    expect(COLLECTION_FACT_IDENTITY.retry).toBe("idempotencyKey");
    expect(COLLECTION_FACT_IDENTITY.fact).toBe("collectionFactId");
    expect(COLLECTION_FACT_IDENTITY.economicSale).toContain("orderId");
    expect(COLLECTION_FACT_FINALITY.paid).toContain("not a second financial authority");
    expect(COLLECTION_FACT_FINALITY.settlement).toContain("must not mutate");
    expect(PRODUCTION_COLLECTION_FACT_KIND).toBe("collection");
    expect(PRODUCTION_COLLECTION_FACT_SNAPSHOT.terminalId).toContain("mandatory");
    expect(PRODUCTION_COLLECTION_FACT_IDENTITY_RULES.businessDay).toContain(
      "never economic identity"
    );
    expect(PRODUCTION_COLLECTION_FACT_FAILURE.downstreamSettlementFailure).toContain(
      "must not UPDATE/DELETE"
    );
    expect(collectionFactCommitIsPaid("created")).toBe(true);
    expect(collectionFactCommitIsPaid("replayed")).toBe(true);
  });

  it("A accepts a valid production Collection Fact snapshot", () => {
    expect(() =>
      assertProductionCollectionFactCommit({ context: CONTEXT, command: command() })
    ).not.toThrow();
    expect(isProductionCollectionFactCommitCommand(command())).toBe(true);
    expect(
      isProductionCollectionFactCommitCommand(command({ purpose: "test" }))
    ).toBe(false);
  });

  it("accepts a non-Cashier ordering channel under the same contract", () => {
    expect(() =>
      assertProductionCollectionFactCommit({
        context: { ...CONTEXT, actorType: "waiter" },
        command: command({ orderingChannel: ORDERING_CHANNEL_WAITER_TABLET }),
      })
    ).not.toThrow();
  });

  it("B rejects invalid amount", () => {
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({
          amount: "0.00",
          tenders: [{ paymentMethod: "cash", amount: "0.00" }],
        }),
      })
    );
  });

  it("B accepts complimentary zero collection with waived discount", () => {
    expect(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({
          amount: "0.00",
          discountAmount: "100.00",
          taxAmount: "0.00",
          subtotal: "0.00",
          tenders: [{ paymentMethod: "other", amount: "0.00" }],
          taxBreakdown: { lines: [], totalTaxAmount: "0.00" },
          composition: [
            {
              sequence: 1,
              description: "Kabsa",
              netAmount: "100.00",
              taxAmount: "0.00",
              originOrderId: 1001,
            },
          ],
        }),
      })
    ).not.toThrow();
  });

  it("C rejects invalid currency", () => {
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({
          currencySnapshot: { currencyCode: "USD", currencySymbol: "$" },
        }),
      })
    );
  });

  it("D rejects missing economic identity", () => {
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({ orderId: 0 }),
      })
    );
  });

  it("E rejects cross-tenant identity mismatch", () => {
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({ restaurantId: 99 }),
      })
    );
  });

  it("F rejects missing production terminal and keeps isolated rules separate", () => {
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: { ...CONTEXT, terminalId: null },
        command: command(),
      })
    );
    expect(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({ purpose: "test" }),
      })
    ).toThrow(CollectionFactError);
  });

  it("G rejects invalid business day", () => {
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({ businessDay: "today" }),
      })
    );
  });

  it("H rejects missing payment identity", () => {
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({ paymentIntentId: "   " }),
      })
    );
  });

  it("I rejects missing idempotency identity", () => {
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({ idempotencyKey: "short" }),
      })
    );
  });

  it("rejects production actor and tax snapshot defects", () => {
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: { ...CONTEXT, actorUserId: null },
        command: command(),
      })
    );
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: { ...CONTEXT, actorType: null },
        command: command(),
      })
    );
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({
          taxBreakdown: {
            lines: [
              {
                componentId: "vat",
                name: "VAT",
                ratePercent: "15.00",
                amount: "1.00",
              },
            ],
            totalTaxAmount: "1.00",
          },
        }),
      })
    );
    expectValidation(() =>
      assertProductionCollectionFactCommit({
        context: CONTEXT,
        command: command({
          composition: [
            {
              sequence: 1,
              description: "Kabsa",
              netAmount: "100.00",
              taxAmount: "15.00",
              originOrderId: 9999,
            },
          ],
        }),
      })
    );
  });
});
