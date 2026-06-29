import { OrderDomainError } from "../domain/errors/OrderDomainErrors";
import { TRPCError } from "@trpc/server";

export function mapOrderDomainErrorToTrpc(error: unknown): never {
  if (error instanceof OrderDomainError) {
    switch (error.code) {
      case "OrderNotFound":
        throw new TRPCError({ code: "NOT_FOUND", message: error.message });
      case "AccessDenied":
      case "CommercialRestriction":
      case "OrderingDisabled":
      case "RestaurantClosed":
        throw new TRPCError({ code: "FORBIDDEN", message: error.message });
      case "ConcurrencyConflict":
        throw new TRPCError({ code: "CONFLICT", message: error.message });
      case "InvalidTransition":
      case "OrderAlreadyCompleted":
      case "OrderAlreadyCancelled":
      case "OrderImmutable":
      case "EmptyOrder":
      case "DuplicateLineItem":
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      default:
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
  }
  throw error;
}

export async function runOrderCommand<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn();
    try {
      const { runOrderEventRelayBatch } = await import("../eventInfrastructureComposition");
      await runOrderEventRelayBatch();
    } catch {
      /* relay unavailable when composition or DB is partially mocked */
    }
    return result;
  } catch (error) {
    mapOrderDomainErrorToTrpc(error);
  }
}
