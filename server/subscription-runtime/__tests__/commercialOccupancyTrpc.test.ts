/**
 * COMMERCIAL-OCCUPANCY-ERROR-SEMANTICS-HARDENING-1
 */
import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  CommercialLimitExceededError,
  CommercialOccupancyUnavailableError,
} from "../commercialLimitOccupancy";
import {
  COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_CODE,
  COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_MESSAGE,
  throwCommercialOccupancyTrpcError,
} from "../commercialOccupancyTrpc";
import { withCommercialLimitOccupancy } from "../commercialLimitOccupancy";

describe("throwCommercialOccupancyTrpcError", () => {
  it("maps limit exceeded to FORBIDDEN with the quota message, not auth copy", () => {
    try {
      throwCommercialOccupancyTrpcError(
        new CommercialLimitExceededError("limit_exceeded", 2),
        (cap) => `حد ${cap}`
      );
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect(error).toMatchObject({
        code: "FORBIDDEN",
        message: "حد 2",
      });
      expect((error as TRPCError).cause).toBeInstanceOf(
        CommercialLimitExceededError
      );
      expect((error as TRPCError).message).not.toContain("غير مصرح بالوصول");
      return;
    }
    throw new Error("expected throw");
  });

  it("maps occupancy unavailable to INTERNAL_SERVER_ERROR, not limit_exceeded or FORBIDDEN", () => {
    try {
      throwCommercialOccupancyTrpcError(
        new CommercialOccupancyUnavailableError(),
        () => "حد"
      );
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect(error).toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_MESSAGE,
      });
      expect((error as TRPCError).code).not.toBe("FORBIDDEN");
      expect((error as TRPCError).code).not.toBe("UNAUTHORIZED");
      expect((error as TRPCError).message).not.toBe("limit_exceeded");
      expect((error as TRPCError).message).not.toContain("غير مصرح بالوصول");
      expect((error as TRPCError).message).not.toMatch(/pos_terminals|FOR UPDATE|SQL/i);
      expect(COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_CODE).toBe(
        "commercial_capacity_unavailable"
      );
      return;
    }
    throw new Error("expected throw");
  });

  it("does not convert occupancy unavailable into limit exceeded", () => {
    expect(() =>
      throwCommercialOccupancyTrpcError(
        new CommercialOccupancyUnavailableError("commercial_occupancy_unavailable"),
        () => "limit_exceeded"
      )
    ).toThrow(TRPCError);
    try {
      throwCommercialOccupancyTrpcError(
        new CommercialOccupancyUnavailableError(),
        () => "limit_exceeded"
      );
    } catch (error) {
      expect((error as TRPCError).message).not.toBe("limit_exceeded");
      expect((error as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    }
  });
});

describe("occupancy fail-closed does not create the resource", () => {
  it("does not call create when the commercial limit is exceeded", async () => {
    const create = vi.fn(async () => ({ id: 1 }));
    await expect(
      withCommercialLimitOccupancy({
        scope: { kind: "owner", scopeId: 9, ownerUserId: 9 },
        limitKey: "restaurants",
        occupancyDelta: 1,
        decide: async () => ({
          allowed: false,
          reasonCode: "limit_exceeded",
          limitKey: "restaurants",
          cap: 1,
          proposedTotal: 2,
          policy: "hard",
          source: "test",
        }),
        countOccupancy: async () => 1,
        create,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    expect(create).not.toHaveBeenCalled();
  });
});
