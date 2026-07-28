import { LifecycleSettlementGuardError } from "@shared/operational-session";
import { OrderDomainError } from "../domain/errors/OrderDomainErrors";
import { PlaceOrderNotesValidationError } from "./PlaceOrderService";
import { TRPCError } from "@trpc/server";
import {
  markOrderLifecycleLatency,
  noteOrderLifecyclePhase,
  noteOrderLifecycleMeta,
  getOrderLifecycleLatencyContext,
} from "../observability/orderLifecycleLatency";
import { orderLifecycleNowMs } from "@shared/order-lifecycle-latency";

export function mapOrderDomainErrorToTrpc(error: unknown): never {
  if (error instanceof LifecycleSettlementGuardError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  if (error instanceof PlaceOrderNotesValidationError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
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
      case "InvalidLifecycleTransition":
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

/**
 * Runs an order write command then awaits outbox relay (unchanged behavior).
 * ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1 — records phase timings when a
 * lifecycle ALS context is active (status transitions). Place-order callers
 * remain unaffected.
 */
export async function runOrderCommand<T>(fn: () => Promise<T>): Promise<T> {
  const latencyActive = Boolean(getOrderLifecycleLatencyContext());
  try {
    if (latencyActive) markOrderLifecycleLatency("command_start");
    const commandStarted = orderLifecycleNowMs();
    const result = await fn();
    if (latencyActive) {
      noteOrderLifecyclePhase(
        "domain_command_ms",
        orderLifecycleNowMs() - commandStarted
      );
      markOrderLifecycleLatency("command_complete");
    }
    try {
      if (latencyActive) markOrderLifecycleLatency("relay_start");
      const relayStarted = orderLifecycleNowMs();
      const { runOrderEventRelayBatch } = await import(
        "../eventInfrastructureComposition"
      );
      const batch = await runOrderEventRelayBatch();
      if (latencyActive) {
        noteOrderLifecyclePhase(
          "event_relay_ms",
          orderLifecycleNowMs() - relayStarted
        );
        noteOrderLifecycleMeta("event_relay_processed", batch.processed);
        noteOrderLifecycleMeta("event_relay_published", batch.published);
        noteOrderLifecycleMeta("event_relay_failed", batch.failed);
        markOrderLifecycleLatency("relay_end");
      }
    } catch {
      /* relay unavailable when composition or DB is partially mocked */
      if (latencyActive) {
        noteOrderLifecycleMeta("event_relay_unavailable", true);
        markOrderLifecycleLatency("relay_end");
      }
    }
    return result;
  } catch (error) {
    mapOrderDomainErrorToTrpc(error);
  }
}
