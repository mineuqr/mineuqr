/**
 * THERMAL-PRINTING-11C — read-only print operations aggregation (no mutations).
 */
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import type { ExecutionTransport } from "../../shared/printing/executionCapabilities";
import { getAgentConnectivityState } from "./agentLifecycleService";
import { listPrintJobAssignmentsForRestaurant } from "./assignmentService";
import { getJobDeliveryState } from "./deliveryStateTracker";
import { listStoredJobExecutionOutcomes } from "./executionOutcomeStore";
import { getPrinterProfile } from "./printerProfileQueries";
import {
  countPrintJobsByStatusForRestaurant,
  findLatestPrintJobForPrinter,
  findPrintJobById,
  listPrintJobsForRestaurant,
} from "./printJobRepository";
import { listPrintersForRestaurant } from "./printerRepository";
import { getJobProtocolStatus } from "./protocolStatusQueries";
import { getPrinterResolution } from "./resolutionQueries";
import { getRoutingDecision } from "./routingQueries";
import { getStoredJobExecutionOutcome } from "./executionOutcomeStore";
import { getPrintJobAssignment } from "./assignmentService";
import type {
  PaginatedPrintJobs,
  PrintFailureItem,
  PrintJobDetailView,
  PrintJobOperationalStatus,
  PrintJobQueueItem,
  PrintOperationsSummary,
  PrinterDetailView,
  PrinterOverviewItem,
  PrinterResolutionStatus,
} from "./printOperationsTypes";

function mapOperationalStatus(input: {
  dbStatus: string;
  assignmentAgentId: string | null;
  deliveryState?: string;
  outcomeStatus?: string;
}): PrintJobOperationalStatus {
  if (input.dbStatus === PRINT_JOB_STATUS.FAILED) {
    return "failed";
  }
  if (input.dbStatus === PRINT_JOB_STATUS.CANCELLED) {
    return "cancelled";
  }
  if (input.dbStatus === PRINT_JOB_STATUS.EXPIRED) {
    return "expired";
  }
  if (input.deliveryState === "delivered" || input.dbStatus === PRINT_JOB_STATUS.PRINTED) {
    return "delivered";
  }
  if (
    input.dbStatus === PRINT_JOB_STATUS.PRINTING ||
    input.outcomeStatus === "executed" ||
    input.outcomeStatus === "prepared"
  ) {
    return "executing";
  }
  if (input.assignmentAgentId) {
    return "assigned";
  }
  return "queued";
}

async function buildPrinterOverviewItem(printer: {
  id: number;
  name: string;
  profileId: string;
  isDefault: boolean;
}): Promise<PrinterOverviewItem> {
  const resolution = getPrinterResolution(printer.id);
  let transport: ExecutionTransport | "unknown" = "unknown";
  let isActive = false;

  if (resolution) {
    const profile = getPrinterProfile(resolution.agentId, resolution.profilePrinterId);
    if (profile) {
      transport = profile.transport;
      const connectivity = getAgentConnectivityState(resolution.agentId);
      isActive = connectivity?.status === "online";
    }
  }

  const latestJob = await findLatestPrintJobForPrinter(printer.id);

  return {
    id: printer.id,
    name: printer.name,
    profileId: printer.profileId,
    transport,
    isActive,
    isDefault: printer.isDefault,
    lastActivityAt: latestJob?.updatedAt ?? null,
  };
}

function resolvePrinterResolutionStatus(dbPrinterId: number): PrinterResolutionStatus {
  const resolution = getPrinterResolution(dbPrinterId);
  if (!resolution) {
    return {
      status: "unresolved",
      reason: "Printer is not resolved to an online agent profile",
    };
  }

  return {
    status: "resolved",
    agentId: resolution.agentId,
    profilePrinterId: resolution.profilePrinterId,
  };
}

function buildPrintJobQueueItem(job: {
  id: number;
  orderId: number;
  printerId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}): PrintJobQueueItem {
  const assignment = getPrintJobAssignment(job.id);
  const outcome = getStoredJobExecutionOutcome(job.id);
  const delivery =
    assignment != null
      ? getJobDeliveryState(assignment.agentId, job.id)
      : undefined;

  return {
    id: job.id,
    orderId: job.orderId,
    printerId: job.printerId,
    dbStatus: job.status,
    operationalStatus: mapOperationalStatus({
      dbStatus: job.status,
      assignmentAgentId: assignment?.agentId ?? null,
      deliveryState: delivery?.state,
      outcomeStatus: outcome?.outcomeStatus,
    }),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    assignedAgentId: assignment?.agentId ?? null,
  };
}

export async function getPrintOperationsSummary(
  restaurantId: number
): Promise<PrintOperationsSummary> {
  const [printers, statusCounts] = await Promise.all([
    listPrintersForRestaurant(restaurantId),
    countPrintJobsByStatusForRestaurant(restaurantId),
  ]);

  const printerOverviews = await Promise.all(printers.map((printer) => buildPrinterOverviewItem(printer)));
  const activePrinters = printerOverviews.filter((printer) => printer.isActive).length;

  const totalJobs = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const successfulJobs = statusCounts[PRINT_JOB_STATUS.PRINTED] ?? 0;
  const failedJobs = statusCounts[PRINT_JOB_STATUS.FAILED] ?? 0;
  const queuedJobs = statusCounts[PRINT_JOB_STATUS.QUEUED] ?? 0;

  return {
    totalPrinters: printers.length,
    activePrinters,
    inactivePrinters: printers.length - activePrinters,
    totalJobs,
    successfulJobs,
    failedJobs,
    queuedJobs,
  };
}

export async function listPrinterOverview(
  restaurantId: number
): Promise<PrinterOverviewItem[]> {
  const printers = await listPrintersForRestaurant(restaurantId);
  return Promise.all(printers.map((printer) => buildPrinterOverviewItem(printer)));
}

export async function getPrinterDetail(
  restaurantId: number,
  printerId: number
): Promise<PrinterDetailView | null> {
  const printers = await listPrintersForRestaurant(restaurantId);
  const printer = printers.find((row) => row.id === printerId);
  if (!printer) {
    return null;
  }

  const overview = await buildPrinterOverviewItem(printer);
  const { jobs } = await listPrintJobsForRestaurant({
    restaurantId,
    printerId,
    limit: 10,
    offset: 0,
  });

  return {
    ...overview,
    paperWidthMm: printer.paperWidthMm,
    resolution: resolvePrinterResolutionStatus(printer.id),
    recentJobs: jobs.map((job) => buildPrintJobQueueItem(job)),
  };
}

export async function listPrintJobQueue(
  restaurantId: number,
  input: { limit: number; offset: number }
): Promise<PaginatedPrintJobs> {
  const result = await listPrintJobsForRestaurant({
    restaurantId,
    limit: input.limit,
    offset: input.offset,
  });

  return {
    jobs: result.jobs.map((job) => buildPrintJobQueueItem(job)),
    total: result.total,
    limit: input.limit,
    offset: input.offset,
  };
}

export async function getPrintJobDetail(
  restaurantId: number,
  jobId: number
): Promise<PrintJobDetailView | null> {
  const job = await findPrintJobById(jobId);
  if (!job || job.restaurantId !== restaurantId) {
    return null;
  }

  const assignment = getPrintJobAssignment(job.id);
  const routing = getRoutingDecision(job.id);
  const outcome = getStoredJobExecutionOutcome(job.id);
  const delivery =
    assignment != null ? getJobDeliveryState(assignment.agentId, job.id) : undefined;
  const protocol = getJobProtocolStatus(job.id);
  const queueItem = buildPrintJobQueueItem(job);

  return {
    ...queueItem,
    idempotencyKey: job.idempotencyKey,
    attemptCount: job.attemptCount,
    assignment: assignment
      ? {
          agentId: assignment.agentId,
          assignedAt: assignment.assignedAt,
          printerId: assignment.printerId,
        }
      : null,
    routing: routing
      ? {
          agentId: routing.agentId,
          reason: routing.reason,
        }
      : null,
    executionOutcome: outcome
      ? {
          outcomeStatus: outcome.outcomeStatus,
          category: outcome.category,
          transport: outcome.transport,
          message: outcome.message,
          timestamp: outcome.timestamp,
        }
      : null,
    deliveryState: delivery
      ? {
          state: delivery.state,
          acknowledgedAt: delivery.acknowledgedAt,
          deliveredAt: delivery.deliveredAt,
        }
      : null,
    protocolStatus: protocol
      ? {
          state: protocol.state,
          timestamp: protocol.timestamp,
        }
      : null,
  };
}

export async function listPrintFailures(
  restaurantId: number,
  limit: number
): Promise<PrintFailureItem[]> {
  const failures: PrintFailureItem[] = [];

  const { jobs: failedJobs } = await listPrintJobsForRestaurant({
    restaurantId,
    limit: 100,
    offset: 0,
  });

  for (const job of failedJobs) {
    if (job.status !== PRINT_JOB_STATUS.FAILED) {
      continue;
    }
    failures.push({
      jobId: job.id,
      orderId: job.orderId,
      printerId: job.printerId,
      failureLayer: "job-status",
      failureCode: PRINT_JOB_STATUS.FAILED,
      failureMessage: "Print job marked as failed",
      timestamp: job.updatedAt,
    });
  }

  const jobIdsForRestaurant = new Set(
    (await listPrintJobsForRestaurant({ restaurantId, limit: 200, offset: 0 })).jobs.map(
      (job) => job.id
    )
  );

  for (const outcome of listStoredJobExecutionOutcomes()) {
    if (!jobIdsForRestaurant.has(outcome.jobId)) {
      continue;
    }
    if (outcome.outcomeStatus === "executed") {
      continue;
    }

    const job = await findPrintJobById(outcome.jobId);
    if (!job || job.restaurantId !== restaurantId) {
      continue;
    }

    const failureLayer =
      outcome.category === "execution-failure"
        ? "execution"
        : outcome.category === "transport-failure" ||
            outcome.category === "retry-exhausted" ||
            outcome.category === "printer-unreachable"
          ? "transport"
          : "execution";

    failures.push({
      jobId: outcome.jobId,
      orderId: job.orderId,
      printerId: job.printerId,
      failureLayer,
      failureCode: outcome.category,
      failureMessage: outcome.message ?? outcome.category,
      timestamp: outcome.timestamp,
    });
  }

  for (const assignment of listPrintJobAssignmentsForRestaurant(restaurantId)) {
    const resolution = getPrinterResolution(assignment.printerId);
    if (resolution) {
      continue;
    }
    const job = await findPrintJobById(assignment.jobId);
    if (!job) {
      continue;
    }
    failures.push({
      jobId: assignment.jobId,
      orderId: assignment.orderId,
      printerId: assignment.printerId,
      failureLayer: "resolution",
      failureCode: "unresolved-printer",
      failureMessage: "Printer could not be resolved to an agent profile",
      timestamp: assignment.assignedAt,
    });
  }

  return failures
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, limit);
}
