/**
 * THERMAL-PRINTING-13I.4A — centralized tenant ownership assertions.
 *
 * Every execution boundary must validate restaurantId through these helpers.
 * Do not duplicate comparison logic elsewhere in the printing pipeline.
 */
import { resolveRestaurantIdForAgent } from "./endpointRegistryCompatibility";

export const TENANT_OWNERSHIP_VIOLATION = {
  RESTAURANT_MISMATCH: "restaurant-mismatch",
  AGENT_RESTAURANT_MISMATCH: "agent-restaurant-mismatch",
  PRINTER_RESTAURANT_MISMATCH: "printer-restaurant-mismatch",
  ASSIGNMENT_RESTAURANT_MISMATCH: "assignment-restaurant-mismatch",
} as const;

export type TenantOwnershipViolationCode =
  (typeof TENANT_OWNERSHIP_VIOLATION)[keyof typeof TENANT_OWNERSHIP_VIOLATION];

export class TenantOwnershipViolationError extends Error {
  constructor(
    public readonly code: TenantOwnershipViolationCode,
    message: string
  ) {
    super(message);
    this.name = "TenantOwnershipViolationError";
  }
}

export function assertRestaurantIdMatch(
  actual: number,
  expected: number,
  context: string
): void {
  if (actual !== expected) {
    throw new TenantOwnershipViolationError(
      TENANT_OWNERSHIP_VIOLATION.RESTAURANT_MISMATCH,
      `${context}: restaurant ${actual} does not match expected ${expected}`
    );
  }
}

export function assertJobPrinterRestaurantOwnership(
  jobRestaurantId: number,
  printerRestaurantId: number
): void {
  if (jobRestaurantId !== printerRestaurantId) {
    throw new TenantOwnershipViolationError(
      TENANT_OWNERSHIP_VIOLATION.PRINTER_RESTAURANT_MISMATCH,
      `Printer belongs to restaurant ${printerRestaurantId}, job belongs to restaurant ${jobRestaurantId}`
    );
  }
}

export function assertAssignmentJobRestaurantOwnership(
  assignmentRestaurantId: number,
  jobRestaurantId: number
): void {
  if (assignmentRestaurantId !== jobRestaurantId) {
    throw new TenantOwnershipViolationError(
      TENANT_OWNERSHIP_VIOLATION.ASSIGNMENT_RESTAURANT_MISMATCH,
      `Assignment restaurant ${assignmentRestaurantId} does not match job restaurant ${jobRestaurantId}`
    );
  }
}

export function resolveAgentRestaurantId(agentId: string): number | undefined {
  return resolveRestaurantIdForAgent(agentId.trim());
}

export function assertAgentAuthorizedForRestaurant(
  agentId: string,
  restaurantId: number
): void {
  const agentRestaurantId = resolveAgentRestaurantId(agentId);
  if (agentRestaurantId === undefined) {
    throw new TenantOwnershipViolationError(
      TENANT_OWNERSHIP_VIOLATION.AGENT_RESTAURANT_MISMATCH,
      `Agent ${agentId} has no resolvable restaurant ownership`
    );
  }
  assertRestaurantIdMatch(agentRestaurantId, restaurantId, `Agent ${agentId}`);
}

export function isAgentOwnedByRestaurant(agentId: string, restaurantId: number): boolean {
  const agentRestaurantId = resolveAgentRestaurantId(agentId);
  return agentRestaurantId === restaurantId;
}

export function rejectIfAgentJobRestaurantMismatch(input: {
  agentId: string;
  jobRestaurantId: number;
}): string | undefined {
  const agentRestaurantId = resolveAgentRestaurantId(input.agentId);
  if (agentRestaurantId === undefined) {
    return "Agent restaurant ownership cannot be verified";
  }
  if (agentRestaurantId !== input.jobRestaurantId) {
    return "Print job restaurant does not match agent ownership";
  }
  return undefined;
}

export function rejectIfAssignmentJobRestaurantMismatch(input: {
  assignmentRestaurantId: number;
  jobRestaurantId: number;
}): string | undefined {
  if (input.assignmentRestaurantId !== input.jobRestaurantId) {
    return "Print job assignment restaurant does not match job ownership";
  }
  return undefined;
}

export type PrintJobOwnershipChainInput = {
  jobRestaurantId: number;
  printerRestaurantId: number;
  agentId: string;
  assignmentRestaurantId?: number;
};

export function assertPrintJobOwnershipChain(input: PrintJobOwnershipChainInput): void {
  assertJobPrinterRestaurantOwnership(input.jobRestaurantId, input.printerRestaurantId);
  assertAgentAuthorizedForRestaurant(input.agentId, input.jobRestaurantId);
  if (input.assignmentRestaurantId != null) {
    assertAssignmentJobRestaurantOwnership(input.assignmentRestaurantId, input.jobRestaurantId);
  }
}

export function rejectIfPrintJobOwnershipViolated(input: {
  agentId: string;
  jobRestaurantId: number;
  printerRestaurantId: number;
  assignmentRestaurantId: number;
}): string | undefined {
  if (input.jobRestaurantId !== input.printerRestaurantId) {
    return "Print job printer does not belong to job restaurant";
  }

  const assignmentMismatch = rejectIfAssignmentJobRestaurantMismatch({
    assignmentRestaurantId: input.assignmentRestaurantId,
    jobRestaurantId: input.jobRestaurantId,
  });
  if (assignmentMismatch) {
    return assignmentMismatch;
  }

  return rejectIfAgentJobRestaurantMismatch({
    agentId: input.agentId,
    jobRestaurantId: input.jobRestaurantId,
  });
}
