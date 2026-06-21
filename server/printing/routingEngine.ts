/**
 * THERMAL-PRINTING-8A.3 / 8B.4 — deterministic agent routing engine.
 */
import { getAgentConnectivityState } from "./agentLifecycleService";
import { listAgents } from "./agentRegistry";
import { resolvePrinter } from "./printerResolutionService";
import {
  ResolutionRejectedError,
  RESOLUTION_FAILURE_CODES,
} from "./resolutionTypes";
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

function listOnlineAgentIds(now?: Date): string[] {
  return listAgents()
    .map((agent) => ({
      agentId: agent.registration.identity.agentId,
      connectivity: getAgentConnectivityState(agent.registration.identity.agentId, {
        now,
      }),
    }))
    .filter((entry) => entry.connectivity?.status === "online")
    .sort((left, right) => left.agentId.localeCompare(right.agentId))
    .map((entry) => entry.agentId);
}

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

function routeViaSingleCandidate(input: ResolveRoutingDecisionInput): RoutingDecision {
  const onlineAgents = listOnlineAgentIds(input.evaluationNow);
  if (onlineAgents.length === 0) {
    throw new RoutingRejectedError(
      ROUTING_FAILURE_CODES.NO_CANDIDATES,
      "No online print agents available"
    );
  }
  if (onlineAgents.length > 1) {
    throw new RoutingRejectedError(
      ROUTING_FAILURE_CODES.MULTIPLE_CANDIDATES,
      "Multiple online print agents available without printer resolution"
    );
  }

  return storeRoutingDecision({
    jobId: input.jobId,
    agentId: onlineAgents[0]!,
    printerId: input.printerId,
    reason: ROUTING_REASONS.SINGLE_CANDIDATE,
  });
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

  const existing = routingDecisions.get(input.jobId);
  if (existing) {
    return existing;
  }

  const manualAgentId = manualRoutingAssignments.get(input.jobId);
  if (manualAgentId) {
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
    if (error instanceof ResolutionRejectedError) {
      if (error.code === RESOLUTION_FAILURE_CODES.UNKNOWN_DB_PRINTER) {
        return routeViaSingleCandidate(input);
      }

      throw new RoutingRejectedError(
        mapResolutionFailureToRouting(error.code),
        error.message
      );
    }
    throw error;
  }
}
