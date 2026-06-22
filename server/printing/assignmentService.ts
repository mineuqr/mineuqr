/**
 * THERMAL-PRINTING-7A.1 / 8A.4 — server-side print job assignment (queue + routing authoritative).
 */
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { findPrintJobById } from "./printJobRepository";
import { PrintJobNotFoundError } from "./printJobTypes";
import { resolveRoutingDecision } from "./routingEngine";
import { RoutingRejectedError } from "./routingTypes";
import {
  NoEligibleAgentError,
  PrintJobAssignmentError,
  type AssignPrintJobInput,
  type AssignPrintJobResult,
  type PrintJobAssignment,
} from "./assignmentTypes";

const assignments = new Map<number, PrintJobAssignment>();

function resolveAssignedAt(input: AssignPrintJobInput): string {
  return input.assignedAt ?? new Date().toISOString();
}

function assertAssignablePrintJob(job: {
  id: number;
  status: string;
  restaurantId: number;
  orderId: number;
  printerId: number | null;
}): void {
  if (job.status !== PRINT_JOB_STATUS.QUEUED) {
    throw new PrintJobAssignmentError(
      `Print job must be queued for assignment (current: ${job.status})`
    );
  }
  if (job.printerId == null || !Number.isInteger(job.printerId) || job.printerId <= 0) {
    throw new PrintJobAssignmentError("Print job requires a printerId before assignment");
  }
}

function selectAgentForAssignmentViaRouting(input: {
  jobId: number;
  printerId: number;
  evaluationNow?: Date;
}): string {
  try {
    return resolveRoutingDecision(input).agentId;
  } catch (error) {
    if (error instanceof RoutingRejectedError) {
      throw new NoEligibleAgentError(error.message);
    }
    throw error;
  }
}

export function getPrintJobAssignment(jobId: number): PrintJobAssignment | undefined {
  return assignments.get(jobId);
}

export function listPrintJobAssignmentsForRestaurant(
  restaurantId: number
): PrintJobAssignment[] {
  return Array.from(assignments.values())
    .filter((assignment) => assignment.restaurantId === restaurantId)
    .sort((left, right) => right.assignedAt.localeCompare(left.assignedAt));
}

export function clearPrintJobAssignments(): void {
  assignments.clear();
}

export async function assignPrintJob(
  input: AssignPrintJobInput
): Promise<AssignPrintJobResult> {
  if (!Number.isInteger(input.jobId) || input.jobId <= 0) {
    throw new PrintJobAssignmentError("Invalid jobId");
  }

  const existing = assignments.get(input.jobId);
  if (existing) {
    return { assignment: existing, created: false };
  }

  const job = await findPrintJobById(input.jobId);
  if (!job) {
    throw new PrintJobNotFoundError();
  }

  assertAssignablePrintJob(job);

  const agentId = selectAgentForAssignmentViaRouting({
    jobId: job.id,
    printerId: job.printerId!,
    evaluationNow: input.evaluationNow,
  });
  const assignment: PrintJobAssignment = {
    jobId: job.id,
    agentId,
    restaurantId: job.restaurantId,
    orderId: job.orderId,
    printerId: job.printerId!,
    assignedAt: resolveAssignedAt(input),
  };

  assignments.set(job.id, assignment);
  return { assignment, created: true };
}
