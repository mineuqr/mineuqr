import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { throwSettlementRecordApiError } from "../mapSettlementRecordApiError";
import {
  AmbiguousPaidSaleReceiptError,
  PaidSaleReceiptIdentityError,
} from "../paidSaleReceiptResolution";

describe("throwSettlementRecordApiError RECEIPT-SR-IDENTITY-1", () => {
  it("maps ambiguous Collection Fact identity to CONFLICT", () => {
    expect(() =>
      throwSettlementRecordApiError(
        new AmbiguousPaidSaleReceiptError("two facts")
      )
    ).toThrow(TRPCError);
    try {
      throwSettlementRecordApiError(
        new AmbiguousPaidSaleReceiptError("two facts")
      );
    } catch (error) {
      expect((error as TRPCError).code).toBe("CONFLICT");
    }
  });

  it("maps paid-sale identity errors to NOT_FOUND (fail closed)", () => {
    try {
      throwSettlementRecordApiError(
        new PaidSaleReceiptIdentityError("wrong restaurant")
      );
    } catch (error) {
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    }
  });

  it("does not map query failures as legacy NOT_FOUND", () => {
    try {
      throwSettlementRecordApiError(new Error("db unavailable"));
    } catch (error) {
      expect((error as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    }
  });
});
