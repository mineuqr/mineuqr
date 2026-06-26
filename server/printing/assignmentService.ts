/**
 * THERMAL-PRINTING-7A.1 / 8A.4 / 13I.3C.1 — server-side print job assignment.
 */
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { findPrintJobById } from "./printJobRepository";
import { PrintJobNotFoundError } from "./printJobTypes";
import {
  PRINT_JOB_EXECUTION_TRANSITION,
  transitionPrintJobExecutionState,
} from "./printJobExecutionState";
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

function buildAssignmentFromJob(job: SelectPrintJob, agentId: string): PrintJobAssignment {
  return {
    jobId: job.id,
    agentId,
    restaurantId: job.restaurantId,
    orderId: job.orderId,
    printerId: job.printerId!,
    assignedAt: job.assignedAt ?? resolveAssignedAt({ jobId: job.id }),
  };
}

function cacheAssignment(assignment: PrintJobAssignment): void {
  assignments.set(assignment.jobId, assignment);
}

function assertQueuedForInitialAssignment(job: {
  status: string;
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

export async function resolvePrintJobAssignment(
  jobId: number
): Promise<PrintJobAssignment | undefined> {
  const cached = assignments.get(jobId);
  if (cached) {
    return cached;
  }

  const job = await findPrintJobById(jobId);
  if (!job?.assignedAgentId || job.printerId == null) {
    return undefined;
  }

  if (
    job.status === PRINT_JOB_STATUS.QUEUED ||
    job.status === PRINT_JOB_STATUS.CANCELLED ||
    job.status === PRINT_JOB_STATUS.EXPIRED
  ) {
    return undefined;
  }

  const assignment = buildAssignmentFromJob(job, job.assignedAgentId);
  cacheAssignment(assignment);
  return assignment;
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

  if (job.status === PRINT_JOB_STATUS.ASSIGNED && job.assignedAgentId) {
    const assignment = buildAssignmentFromJob(job, job.assignedAgentId);
    cacheAssignment(assignment);
    return { assignment, created: false };
  }

  assertQueuedForInitialAssignment(job);

  const agentId = selectAgentForAssignmentViaRouting({
    jobId: job.id,
    printerId: job.printerId!,
    evaluationNow: input.evaluationNow,
  });

  const transition = await transitionPrintJobExecutionState({
    jobId: job.id,
    transition: PRINT_JOB_EXECUTION_TRANSITION.ASSIGN,
    agentId,
  });

  if ("rejected" in transition) {
    throw new PrintJobAssignmentError(transition.reason);
  }

  const updatedJob = transition.job;
  const assignment = buildAssignmentFromJob(updatedJob, agentId);
  cacheAssignment(assignment);

  return {
    assignment,
    created: transition.applied && !transition.duplicate,
  };
}
