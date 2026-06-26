/**
 * THERMAL-PRINTING-8A.3 / 8B.4 / 13I.4A — deterministic agent routing engine.
 */
import { getAgentConnectivityState } from "./agentLifecycleService";
import { resolvePrinter } from "./printerResolutionService";
import {
  ResolutionRejectedError,
  RESOLUTION_FAILURE_CODES,
} from "./resolutionTypes";
import {
  assertAgentAuthorizedForRestaurant,
  TenantOwnershipViolationError,
} from "./tenantOwnershipAuthority";
import {
  ROUTING_FAILURE_CODES,
  ROUTING_REASONS,
  RoutingRejectedError,
  type ResolveRoutingDecisionInput,
  type RoutingDecision,
  type RoutingFailureCode,
} from "./routingTypes";

const routingDecisions = new Map<number, RoutingDecision>();
const manualRoutingAssignments = new Map<number, string>();

function isAgentOnline(agentId: string, now?: Date): boolean {
  return getAgentConnectivityState(agentId, { now })?.status === "online";
}

function storeRoutingDecision(decision: RoutingDecision): RoutingDecision {
  routingDecisions.set(decision.jobId, decision);
  return decision;
}

function mapResolutionFailureToRouting(code: ResolutionRejectedError["code"]): RoutingFailureCode {
  switch (code) {
    case RESOLUTION_FAILURE_CODES.RESOLUTION_CONFLICT:
      return ROUTING_FAILURE_CODES.RESOLUTION_CONFLICT;
    case RESOLUTION_FAILURE_CODES.UNKNOWN_PROFILE:
      return ROUTING_FAILURE_CODES.UNRESOLVED_PRINTER;
    case RESOLUTION_FAILURE_CODES.UNKNOWN_DB_PRINTER:
      return ROUTING_FAILURE_CODES.UNRESOLVED_PRINTER;
    default:
      return ROUTING_FAILURE_CODES.UNKNOWN_PRINTER;
  }
}

function assertAgentRestaurantForRouting(agentId: string, restaurantId: number): void {
  try {
    assertAgentAuthorizedForRestaurant(agentId, restaurantId);
  } catch (error) {
    if (error instanceof TenantOwnershipViolationError) {
      throw new RoutingRejectedError(ROUTING_FAILURE_CODES.RESTAURANT_MISMATCH, error.message);
    }
    throw error;
  }
}

export function getRoutingDecision(jobId: number): RoutingDecision | undefined {
  return routingDecisions.get(jobId);
}

export function clearRoutingState(): void {
  routingDecisions.clear();
  manualRoutingAssignments.clear();
}

export function setManualRoutingAssignment(jobId: number, agentId: string): void {
  manualRoutingAssignments.set(jobId, agentId.trim());
}

export function resolveRoutingDecision(
  input: ResolveRoutingDecisionInput
): RoutingDecision {
  if (!Number.isInteger(input.jobId) || input.jobId <= 0) {
    throw new RoutingRejectedError(
      ROUTING_FAILURE_CODES.UNKNOWN_PRINTER,
      "Invalid jobId"
    );
  }
  if (!Number.isInteger(input.printerId) || input.printerId <= 0) {
    throw new RoutingRejectedError(
      ROUTING_FAILURE_CODES.UNKNOWN_PRINTER,
      "Invalid printerId"
    );
  }
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new RoutingRejectedError(
      ROUTING_FAILURE_CODES.RESTAURANT_MISMATCH,
      "Invalid restaurantId"
    );
  }

  const existing = routingDecisions.get(input.jobId);
  if (existing) {
    return existing;
  }

  const manualAgentId = manualRoutingAssignments.get(input.jobId);
  if (manualAgentId) {
    assertAgentRestaurantForRouting(manualAgentId, input.restaurantId);

    if (!isAgentOnline(manualAgentId, input.evaluationNow)) {
      throw new RoutingRejectedError(
        ROUTING_FAILURE_CODES.OFFLINE_OWNER,
        "Manual routing assignment target is offline"
      );
    }

    return storeRoutingDecision({
      jobId: input.jobId,
      agentId: manualAgentId,
      printerId: input.printerId,
      reason: ROUTING_REASONS.MANUAL_ASSIGNMENT,
    });
  }

  try {
    const resolution = resolvePrinter(input.printerId);

    assertAgentRestaurantForRouting(resolution.agentId, input.restaurantId);

    if (!isAgentOnline(resolution.agentId, input.evaluationNow)) {
      throw new RoutingRejectedError(
        ROUTING_FAILURE_CODES.OFFLINE_OWNER,
        "Resolved printer owner is offline"
      );
    }

    return storeRoutingDecision({
      jobId: input.jobId,
      agentId: resolution.agentId,
      printerId: input.printerId,
      reason: ROUTING_REASONS.PRINTER_OWNER,
    });
  } catch (error) {
    if (error instanceof RoutingRejectedError) {
      throw error;
    }
    if (error instanceof ResolutionRejectedError) {
      throw new RoutingRejectedError(
        mapResolutionFailureToRouting(error.code),
        error.message
      );
    }
    throw error;
  }
}
