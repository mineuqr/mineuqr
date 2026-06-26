/**
 * THERMAL-PRINTING-11C — read-only print operations aggregation (no mutations).
 */
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import type { ExecutionTransport } from "../../shared/printing/executionCapabilities";
import { getAgentConnectivityState, listAgentConnectivityStates } from "./agentLifecycleService";
import { getAgent } from "./agentRegistry";
import { listPrintJobAssignmentsForRestaurant } from "./assignmentService";
import { getPrinterProfile, getAgentPrinterProfiles } from "./printerProfileQueries";
import {
  countPrintJobsByStatusForRestaurant,
  findLatestPrintJobForPrinter,
  findPrintJobById,
  listPrintJobsForRestaurant,
} from "./printJobRepository";
import { listPrintersForRestaurant } from "./printerRepository";
import {
  countPrintJobsByStationForRestaurant,
  listPrintStationsForRestaurant,
} from "./stationRepository";
import { getJobProtocolStatus } from "./protocolStatusQueries";
import { getPrinterResolution } from "./resolutionQueries";
import { getRoutingDecision } from "./routingQueries";
import { getStoredJobExecutionOutcome } from "./executionOutcomeStore";
import { getJobDeliveryState } from "./deliveryStateTracker";
import { getPrintDiscoveryDiagnostics } from "./printOperationsDiscoveryService";
import type { DiagnosticRunView } from "./printOperationsDiscoveryTypes";
import { listPrintDiagnosticRunsForRestaurant } from "./diagnosticPrintRepository";
import { resolvePrintingSetupState } from "./setupState";
import type { PrintingSetupStatus } from "./setupState";
import { getPrintingReadinessAuthority } from "./printingReadinessAuthority";
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
  StationOverviewItem,
  AgentOverviewItem,
} from "./printOperationsTypes";

function mapOperationalStatusFromDb(dbStatus: string): PrintJobOperationalStatus {
  switch (dbStatus) {
    case PRINT_JOB_STATUS.QUEUED:
      return "queued";
    case PRINT_JOB_STATUS.ASSIGNED:
    case PRINT_JOB_STATUS.CLAIMED:
      return "assigned";
    case PRINT_JOB_STATUS.PRINTING:
      return "executing";
    case PRINT_JOB_STATUS.PRINTED:
      return "delivered";
    case PRINT_JOB_STATUS.FAILED:
      return "failed";
    case PRINT_JOB_STATUS.CANCELLED:
      return "cancelled";
    case PRINT_JOB_STATUS.EXPIRED:
      return "expired";
    default:
      return "queued";
  }
}

function resolveAssignedAgentIdFromJob(job: {
  assignedAgentId?: string | null;
  status: string;
}): string | null {
  if (job.assignedAgentId?.trim()) {
    return job.assignedAgentId.trim();
  }
  if (
    job.status === PRINT_JOB_STATUS.ASSIGNED ||
    job.status === PRINT_JOB_STATUS.PRINTING ||
    job.status === PRINT_JOB_STATUS.PRINTED ||
    job.status === PRINT_JOB_STATUS.FAILED
  ) {
    return null;
  }
  return null;
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

function buildPrintJobQueueItem(
  job: {
    id: number;
    orderId: number;
    printerId: number | null;
    stationId?: number | null;
    status: string;
    assignedAgentId?: string | null;
    createdAt: string;
    updatedAt: string;
  },
  stationNameById: Map<number, string>
): PrintJobQueueItem {
  const stationId = job.stationId ?? null;

  return {
    id: job.id,
    orderId: job.orderId,
    printerId: job.printerId,
    stationId,
    stationName: stationId != null ? stationNameById.get(stationId) ?? null : null,
    dbStatus: job.status,
    operationalStatus: mapOperationalStatusFromDb(job.status),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    assignedAgentId: resolveAssignedAgentIdFromJob(job),
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

async function loadStationNameMap(restaurantId: number): Promise<Map<number, string>> {
  const stations = await listPrintStationsForRestaurant(restaurantId);
  return new Map(stations.map((station) => [station.id, station.name]));
}

export async function listStationOverview(
  restaurantId: number
): Promise<StationOverviewItem[]> {
  const [stations, printers, jobCounts] = await Promise.all([
    listPrintStationsForRestaurant(restaurantId),
    listPrintersForRestaurant(restaurantId),
    countPrintJobsByStationForRestaurant(restaurantId),
  ]);
  const printerNameById = new Map(printers.map((printer) => [printer.id, printer.name]));

  return stations.map((station) => ({
    id: station.id,
    name: station.name,
    printerId: station.printerId,
    printerName: printerNameById.get(station.printerId) ?? null,
    jobCount: jobCounts.get(station.id) ?? 0,
  }));
}

export async function listAgentOverview(restaurantId: number): Promise<AgentOverviewItem[]> {
  const printers = await listPrintersForRestaurant(restaurantId);
  const restaurantProfileIds = new Set(
    printers.map((printer) => printer.profileId.trim()).filter((profileId) => profileId.length > 0)
  );

  const agents: AgentOverviewItem[] = [];

  for (const connectivity of listAgentConnectivityStates()) {
    const agent = getAgent(connectivity.agentId);
    const inventory = getAgentPrinterProfiles(connectivity.agentId);
    const reportedProfiles = inventory?.profiles ?? [];

    const isRelevant =
      restaurantProfileIds.size === 0
        ? false
        : reportedProfiles.some((profile) => restaurantProfileIds.has(profile.printerId));

    if (!isRelevant) {
      continue;
    }

    agents.push({
      agentId: connectivity.agentId,
      status: connectivity.status,
      platform: agent?.registration.identity.platform ?? "windows",
      connectedAt: agent?.registration.connectedAt ?? null,
      lastHeartbeatAt: connectivity.lastHeartbeatAt ?? null,
      reportedProfileCount: reportedProfiles.length,
    });
  }

  return agents.sort((left, right) => left.agentId.localeCompare(right.agentId));
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
  const stationNameById = await loadStationNameMap(restaurantId);
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
    recentJobs: jobs.map((job) => buildPrintJobQueueItem(job, stationNameById)),
  };
}

export async function listPrintJobQueue(
  restaurantId: number,
  input: { limit: number; offset: number }
): Promise<PaginatedPrintJobs> {
  const [result, stationNameById] = await Promise.all([
    listPrintJobsForRestaurant({
      restaurantId,
      limit: input.limit,
      offset: input.offset,
    }),
    loadStationNameMap(restaurantId),
  ]);

  return {
    jobs: result.jobs.map((job) => buildPrintJobQueueItem(job, stationNameById)),
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

  const routing = getRoutingDecision(job.id);
  const outcome = getStoredJobExecutionOutcome(job.id);
  const assignedAgentId = resolveAssignedAgentIdFromJob(job);
  const delivery =
    assignedAgentId != null ? getJobDeliveryState(assignedAgentId, job.id) : undefined;
  const protocol = getJobProtocolStatus(job.id);
  const stationNameById = await loadStationNameMap(restaurantId);
  const queueItem = buildPrintJobQueueItem(job, stationNameById);

  return {
    ...queueItem,
    idempotencyKey: job.idempotencyKey,
    attemptCount: job.attemptCount,
    assignment:
      assignedAgentId != null && job.printerId != null
        ? {
            agentId: assignedAgentId,
            assignedAt: job.assignedAt ?? job.updatedAt,
            printerId: job.printerId,
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

export async function getPrinterDiscoveryDiagnostics(restaurantId: number) {
  const printerOverviews = await listPrinterOverview(restaurantId);
  return getPrintDiscoveryDiagnostics(restaurantId, printerOverviews);
}

export async function getPrintingSetupStatus(
  restaurantId: number,
  options?: { includeSupport?: boolean }
): Promise<PrintingSetupStatus> {
  if (options?.includeSupport) {
    return resolvePrintingSetupState(restaurantId, { includeSupport: true });
  }
  return getPrintingReadinessAuthority(restaurantId);
}

export async function listDiagnosticRunHistory(
  restaurantId: number,
  limit: number
): Promise<DiagnosticRunView[]> {
  const rows = await listPrintDiagnosticRunsForRestaurant({ restaurantId, limit });
  return rows.map((row) => ({
    diagnosticId: row.diagnosticId,
    printerId: row.printerId,
    agentId: row.agentId,
    status: row.status,
    error: row.error,
    triggeredByLabel: row.triggeredByLabel,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  }));
}
