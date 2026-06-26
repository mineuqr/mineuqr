/**
 * THERMAL-PRINTING-13I.3C.1 — authoritative print job execution state transitions.
 *
 * All agent-runtime execution lifecycle changes must pass through this module.
 * The database is the durable execution authority; runtime memory is not.
 */
import type { SelectPrintJob } from "../../drizzle/schema";
import type { ExecutionOutcomeStatus } from "../../shared/printing/executionOutcome";
import {
  PRINT_JOB_ATTEMPT_EVENT,
  PRINT_JOB_STATUS,
  type PrintJobStatus,
} from "../../shared/printing/types";
import { insertPrintAttempt } from "./printJobAttemptRepository";
import {
  findPrintJobById,
  markJobAssigned,
  markJobFailed,
  markJobPrinted,
  markJobPrinting,
} from "./printJobRepository";
import {
  canPrintJobTransition,
  isTerminalPrintJobStatus,
} from "./printJobTransitions";
import { PrintJobNotFoundError, PrintJobTransitionError } from "./printJobTypes";

export const PRINT_JOB_EXECUTION_TRANSITION = {
  ASSIGN: "assign",
  START_EXECUTION: "start_execution",
  COMPLETE_SUCCESS: "complete_success",
  COMPLETE_FAILURE: "complete_failure",
} as const;

export type PrintJobExecutionTransition =
  (typeof PRINT_JOB_EXECUTION_TRANSITION)[keyof typeof PRINT_JOB_EXECUTION_TRANSITION];

export type PrintJobStatusTransitionMetadata = {
  fromStatus: PrintJobStatus;
  toStatus: PrintJobStatus;
  transition: PrintJobExecutionTransition;
  agentId?: string;
  failureMessage?: string;
  transitionedAt: string;
};

export type TransitionPrintJobExecutionStateInput = {
  jobId: number;
  transition: PrintJobExecutionTransition;
  agentId?: string;
  failureMessage?: string;
};

export type TransitionPrintJobExecutionStateResult =
  | {
      applied: true;
      duplicate: false;
      job: SelectPrintJob;
      fromStatus: PrintJobStatus;
      toStatus: PrintJobStatus;
    }
  | {
      applied: false;
      duplicate: true;
      job: SelectPrintJob;
      currentStatus: PrintJobStatus;
    }
  | {
      rejected: true;
      reason: string;
    };

function toPrintJobStatus(status: string): PrintJobStatus {
  return status as PrintJobStatus;
}

async function recordStatusTransition(
  jobId: number,
  metadata: PrintJobStatusTransitionMetadata
): Promise<void> {
  await insertPrintAttempt({
    printJobId: jobId,
    eventType: PRINT_JOB_ATTEMPT_EVENT.STATUS_TRANSITION,
    metadataJson: metadata as unknown as import("../../shared/printing/types").PrintExecutionAttemptMetadata,
  });
}

function terminalDuplicateResult(
  job: SelectPrintJob,
  expected: PrintJobStatus
): TransitionPrintJobExecutionStateResult | null {
  const status = toPrintJobStatus(job.status);
  if (status === expected) {
    return {
      applied: false,
      duplicate: true,
      job,
      currentStatus: status,
    };
  }
  return null;
}

export async function transitionPrintJobExecutionState(
  input: TransitionPrintJobExecutionStateInput
): Promise<TransitionPrintJobExecutionStateResult> {
  const job = await findPrintJobById(input.jobId);
  if (!job) {
    return { rejected: true, reason: "Print job not found" };
  }

  const fromStatus = toPrintJobStatus(job.status);
  const transitionedAt = new Date().toISOString();

  switch (input.transition) {
    case PRINT_JOB_EXECUTION_TRANSITION.ASSIGN: {
      const agentId = input.agentId?.trim();
      if (!agentId) {
        return { rejected: true, reason: "Agent id is required for assignment" };
      }

      if (fromStatus === PRINT_JOB_STATUS.ASSIGNED) {
        if (job.assignedAgentId === agentId) {
          return {
            applied: false,
            duplicate: true,
            job,
            currentStatus: fromStatus,
          };
        }
        return {
          rejected: true,
          reason: "Print job is already assigned to another agent",
        };
      }

      if (isTerminalPrintJobStatus(fromStatus) || fromStatus === PRINT_JOB_STATUS.PRINTING) {
        return {
          rejected: true,
          reason: `Cannot assign print job in status ${fromStatus}`,
        };
      }

      if (fromStatus !== PRINT_JOB_STATUS.QUEUED) {
        return {
          rejected: true,
          reason: `Cannot assign print job from status ${fromStatus}`,
        };
      }

      if (!canPrintJobTransition(fromStatus, PRINT_JOB_STATUS.ASSIGNED)) {
        return { rejected: true, reason: `Illegal transition: ${fromStatus} → assigned` };
      }

      const updated = await markJobAssigned(input.jobId, agentId);
      if (!updated) {
        const latest = await findPrintJobById(input.jobId);
        if (
          latest &&
          toPrintJobStatus(latest.status) === PRINT_JOB_STATUS.ASSIGNED &&
          latest.assignedAgentId === agentId
        ) {
          return {
            applied: false,
            duplicate: true,
            job: latest,
            currentStatus: PRINT_JOB_STATUS.ASSIGNED,
          };
        }
        return { rejected: true, reason: "Unable to assign print job" };
      }

      await recordStatusTransition(input.jobId, {
        fromStatus,
        toStatus: PRINT_JOB_STATUS.ASSIGNED,
        transition: input.transition,
        agentId,
        transitionedAt,
      });

      return {
        applied: true,
        duplicate: false,
        job: updated,
        fromStatus,
        toStatus: PRINT_JOB_STATUS.ASSIGNED,
      };
    }

    case PRINT_JOB_EXECUTION_TRANSITION.START_EXECUTION: {
      const printingDuplicate = terminalDuplicateResult(job, PRINT_JOB_STATUS.PRINTING);
      if (printingDuplicate) {
        return printingDuplicate;
      }

      if (isTerminalPrintJobStatus(fromStatus)) {
        return {
          rejected: true,
          reason: `Cannot start execution for terminal status ${fromStatus}`,
        };
      }

      if (
        fromStatus !== PRINT_JOB_STATUS.ASSIGNED &&
        fromStatus !== PRINT_JOB_STATUS.CLAIMED
      ) {
        return {
          rejected: true,
          reason: `Cannot start execution from status ${fromStatus}`,
        };
      }

      if (!canPrintJobTransition(fromStatus, PRINT_JOB_STATUS.PRINTING)) {
        return {
          rejected: true,
          reason: `Illegal transition: ${fromStatus} → printing`,
        };
      }

      const updated = await markJobPrinting(input.jobId);
      if (!updated) {
        const latest = await findPrintJobById(input.jobId);
        if (latest && toPrintJobStatus(latest.status) === PRINT_JOB_STATUS.PRINTING) {
          return {
            applied: false,
            duplicate: true,
            job: latest,
            currentStatus: PRINT_JOB_STATUS.PRINTING,
          };
        }
        return { rejected: true, reason: "Unable to start print execution" };
      }

      await recordStatusTransition(input.jobId, {
        fromStatus,
        toStatus: PRINT_JOB_STATUS.PRINTING,
        transition: input.transition,
        agentId: input.agentId,
        transitionedAt,
      });

      return {
        applied: true,
        duplicate: false,
        job: updated,
        fromStatus,
        toStatus: PRINT_JOB_STATUS.PRINTING,
      };
    }

    case PRINT_JOB_EXECUTION_TRANSITION.COMPLETE_SUCCESS: {
      const printedDuplicate = terminalDuplicateResult(job, PRINT_JOB_STATUS.PRINTED);
      if (printedDuplicate) {
        return printedDuplicate;
      }

      if (fromStatus !== PRINT_JOB_STATUS.PRINTING) {
        return {
          rejected: true,
          reason: `Cannot complete success from status ${fromStatus}`,
        };
      }

      const updated = await markJobPrinted(input.jobId);
      if (!updated) {
        const latest = await findPrintJobById(input.jobId);
        if (latest && toPrintJobStatus(latest.status) === PRINT_JOB_STATUS.PRINTED) {
          return {
            applied: false,
            duplicate: true,
            job: latest,
            currentStatus: PRINT_JOB_STATUS.PRINTED,
          };
        }
        return { rejected: true, reason: "Unable to mark print job printed" };
      }

      await recordStatusTransition(input.jobId, {
        fromStatus,
        toStatus: PRINT_JOB_STATUS.PRINTED,
        transition: input.transition,
        agentId: input.agentId,
        transitionedAt,
      });

      return {
        applied: true,
        duplicate: false,
        job: updated,
        fromStatus,
        toStatus: PRINT_JOB_STATUS.PRINTED,
      };
    }

    case PRINT_JOB_EXECUTION_TRANSITION.COMPLETE_FAILURE: {
      const failedDuplicate = terminalDuplicateResult(job, PRINT_JOB_STATUS.FAILED);
      if (failedDuplicate) {
        return failedDuplicate;
      }

      if (fromStatus !== PRINT_JOB_STATUS.PRINTING) {
        return {
          rejected: true,
          reason: `Cannot complete failure from status ${fromStatus}`,
        };
      }

      const updated = await markJobFailed(input.jobId);
      if (!updated) {
        const latest = await findPrintJobById(input.jobId);
        if (latest && toPrintJobStatus(latest.status) === PRINT_JOB_STATUS.FAILED) {
          return {
            applied: false,
            duplicate: true,
            job: latest,
            currentStatus: PRINT_JOB_STATUS.FAILED,
          };
        }
        return { rejected: true, reason: "Unable to mark print job failed" };
      }

      await recordStatusTransition(input.jobId, {
        fromStatus,
        toStatus: PRINT_JOB_STATUS.FAILED,
        transition: input.transition,
        agentId: input.agentId,
        failureMessage: input.failureMessage,
        transitionedAt,
      });

      return {
        applied: true,
        duplicate: false,
        job: updated,
        fromStatus,
        toStatus: PRINT_JOB_STATUS.FAILED,
      };
    }

    default:
      return { rejected: true, reason: "Unknown execution transition" };
  }
}

export function mapExecutionOutcomeToTransition(
  outcomeStatus: ExecutionOutcomeStatus
): PrintJobExecutionTransition {
  if (outcomeStatus === "executed") {
    return PRINT_JOB_EXECUTION_TRANSITION.COMPLETE_SUCCESS;
  }
  return PRINT_JOB_EXECUTION_TRANSITION.COMPLETE_FAILURE;
}

export function assertExecutionTransitionApplied(
  result: TransitionPrintJobExecutionStateResult
): SelectPrintJob {
  if ("rejected" in result) {
    throw new PrintJobTransitionError(result.reason);
  }
  return result.job;
}

export function assertExecutionTransitionAppliedOrDuplicate(
  result: TransitionPrintJobExecutionStateResult
): SelectPrintJob {
  if ("rejected" in result) {
    throw new PrintJobTransitionError(result.reason);
  }
  return result.job;
}

export async function assertPrintJobExists(jobId: number): Promise<SelectPrintJob> {
  const job = await findPrintJobById(jobId);
  if (!job) {
    throw new PrintJobNotFoundError();
  }
  return job;
}
