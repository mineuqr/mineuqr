import { LifecycleSettlementGuardError } from "@shared/operational-session";
import { OrderDomainError } from "../domain/errors/OrderDomainErrors";
import { PlaceOrderNotesValidationError, PlaceOrderValidationError } from "./PlaceOrderService";
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
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
      cause: error,
    });
  }
  if (error instanceof PlaceOrderNotesValidationError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  if (error instanceof PlaceOrderValidationError) {
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

export type RunOrderCommandOptions = {
  /**
   * ORDER-LIFECYCLE-LATENCY-REMEDIATION-1
   * When false, outbox relay runs after the command returns (not on the HTTP
   * critical path). Default true preserves prior place-order / sync behavior.
   */
  awaitRelay?: boolean;
};

async function runOrderEventRelaySafe(latencyActive: boolean): Promise<void> {
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
    if (latencyActive) {
      noteOrderLifecycleMeta("event_relay_unavailable", true);
      markOrderLifecycleLatency("relay_end");
    }
  }
}

function scheduleOrderEventRelay(latencyActive: boolean): void {
  if (latencyActive) {
    noteOrderLifecycleMeta("event_relay_mode", "deferred");
    markOrderLifecycleLatency("relay_start");
    markOrderLifecycleLatency("relay_end");
  }
  const kick = () => {
    void runOrderEventRelaySafe(false);
  };
  if (typeof setImmediate === "function") {
    setImmediate(kick);
  } else {
    setTimeout(kick, 0);
  }
}

/**
 * Runs an order write command, then relays outbox events.
 * ORDER-LIFECYCLE-LATENCY-REMEDIATION-1 — status transitions may defer relay.
 */
export async function runOrderCommand<T>(
  fn: () => Promise<T>,
  options?: RunOrderCommandOptions
): Promise<T> {
  const awaitRelay = options?.awaitRelay !== false;
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

    if (awaitRelay) {
      if (latencyActive) {
        noteOrderLifecycleMeta("event_relay_mode", "awaited");
      }
      await runOrderEventRelaySafe(latencyActive);
    } else {
      scheduleOrderEventRelay(latencyActive);
    }

    return result;
  } catch (error) {
    mapOrderDomainErrorToTrpc(error);
  }
}
