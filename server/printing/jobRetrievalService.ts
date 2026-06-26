/**
 * THERMAL-PRINTING-7A.3 / 10B — authoritative print job retrieval for assigned agents.
 */
import type { AgentJobPayload } from "../../shared/printing/agentJobMessages";
import { isDiagnosticWireJobId, diagnosticOrderIdForWireJob } from "../../shared/printing/diagnosticPrint";
import type { RuntimeExecutionPlanSummary } from "../../shared/printing/executionIntegration";
import type { TransportDeliveryContext } from "../../shared/printing/transports/transportDeliveryContext";
import { getAgent } from "./agentRegistry";
import { resolvePrintJobAssignment } from "./assignmentService";
import { getDiagnosticPrintAssignment } from "./diagnosticAssignmentService";
import { resolveRuntimeExecutionPlan } from "./executionIntegrationFlow";
import { findPrintJobById } from "./printJobRepository";
import { findPrinterById } from "./printerRepository";
import { renderKitchenTicket } from "./ticketRenderer";
import { buildOrderAgentTicketPayload } from "./orderTicketBuilder";
import { findPrintStationById } from "./stationRepository";
import { rejectIfPrintJobOwnershipViolated } from "./tenantOwnershipAuthority";
import { resolveStationItemFilterFromJob } from "./stationRoutingService";
import { buildTransportDeliveryContext } from "./transportDeliveryContextBuilder";
import {
  PRINT_JOB_EXECUTION_TRANSITION,
  transitionPrintJobExecutionState,
} from "./printJobExecutionState";
import { emitPrintJobTelemetryAsync } from "./printJobTelemetryService";
import { PRINT_JOB_TELEMETRY_EVENT } from "../../shared/printing/telemetry";

export class JobRetrievalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobRetrievalError";
  }
}

export type FetchAuthoritativePrintJobInput = {
  agentId: string;
  jobId: number;
};

export type FetchAuthoritativePrintJobResult =
  | {
      found: true;
      job: AgentJobPayload;
      executionPlan: RuntimeExecutionPlanSummary;
      transportDeliveryContext?: TransportDeliveryContext;
    }
  | { found: false; error: string };

function mapKitchenTicketToAgentPayload(input: {
  jobId: number;
  printerId: number;
  restaurantId: number;
  orderId: number;
  ticket: Awaited<ReturnType<typeof renderKitchenTicket>>;
  stationId: number | null;
  stationName: string | null;
}): AgentJobPayload {
  const ticket = buildOrderAgentTicketPayload({
    kitchenTicket: input.ticket,
    stationId: input.stationId,
    stationName: input.stationName,
  });

  return {
    jobId: input.jobId,
    restaurantId: input.restaurantId,
    printerId: input.printerId,
    orderId: input.orderId,
    ticket,
  };
}

async function resolveStationName(input: {
  restaurantId: number;
  stationId: number | null;
}): Promise<string | null> {
  if (input.stationId == null) {
    return null;
  }

  const station = await findPrintStationById(input.stationId);
  if (!station || station.restaurantId !== input.restaurantId) {
    return null;
  }

  return station.name;
}

export async function fetchAuthoritativePrintJob(
  input: FetchAuthoritativePrintJobInput
): Promise<FetchAuthoritativePrintJobResult> {
  const normalizedAgentId = input.agentId.trim();
  if (!normalizedAgentId) {
    return { found: false, error: "Agent id is required" };
  }
  if (!Number.isInteger(input.jobId) || input.jobId <= 0) {
    return { found: false, error: "Invalid jobId" };
  }

  const agent = getAgent(normalizedAgentId);
  if (!agent) {
    return { found: false, error: "Agent not registered" };
  }

  if (isDiagnosticWireJobId(input.jobId)) {
    return fetchAuthoritativeDiagnosticPrintJob({
      agentId: normalizedAgentId,
      wireJobId: input.jobId,
    });
  }

  const assignment = await resolvePrintJobAssignment(input.jobId);
  if (!assignment) {
    return { found: false, error: "Print job assignment not found" };
  }
  if (assignment.agentId !== normalizedAgentId) {
    return { found: false, error: "Print job is not assigned to this agent" };
  }

  const job = await findPrintJobById(input.jobId);
  if (!job) {
    return { found: false, error: "Print job not found" };
  }

  const printer = job.printerId != null ? await findPrinterById(job.printerId) : null;
  if (!printer) {
    return { found: false, error: "Print job printer not found" };
  }

  const ownershipViolation = rejectIfPrintJobOwnershipViolated({
    agentId: normalizedAgentId,
    jobRestaurantId: job.restaurantId,
    printerRestaurantId: printer.restaurantId,
    assignmentRestaurantId: assignment.restaurantId,
  });
  if (ownershipViolation) {
    return { found: false, error: ownershipViolation };
  }

  const executionStart = await transitionPrintJobExecutionState({
    jobId: job.id,
    transition: PRINT_JOB_EXECUTION_TRANSITION.START_EXECUTION,
    agentId: normalizedAgentId,
  });
  if ("rejected" in executionStart) {
    return { found: false, error: executionStart.reason };
  }

  emitPrintJobTelemetryAsync({
    printJobId: job.id,
    restaurantId: job.restaurantId,
    agentId: normalizedAgentId,
    printerId: assignment.printerId,
    eventType: PRINT_JOB_TELEMETRY_EVENT.AGENT_FETCH,
    payload: { duplicate: executionStart.duplicate },
  });

  if (executionStart.applied && !executionStart.duplicate) {
    emitPrintJobTelemetryAsync({
      printJobId: job.id,
      restaurantId: job.restaurantId,
      agentId: normalizedAgentId,
      printerId: assignment.printerId,
      eventType: PRINT_JOB_TELEMETRY_EVENT.EXECUTION_STARTED,
    });
  }

  const stationFilter = resolveStationItemFilterFromJob({
    orderId: job.orderId,
    stationId: job.stationId,
    idempotencyKey: job.idempotencyKey,
  });

  const ticket = await renderKitchenTicket({
    orderId: job.orderId,
    restaurantId: job.restaurantId,
    stationId: stationFilter.stationId,
    stationFilterMode: stationFilter.filterMode,
  });
  const stationName = await resolveStationName({
    restaurantId: job.restaurantId,
    stationId: job.stationId,
  });
  const resolved = resolveRuntimeExecutionPlan({
    agentId: normalizedAgentId,
    dbPrinterId: assignment.printerId,
  });
  const transportDeliveryContext = buildTransportDeliveryContext({
    agentId: normalizedAgentId,
    dbPrinterId: assignment.printerId,
    executionContext: resolved.context,
  });

  return {
    found: true,
    job: mapKitchenTicketToAgentPayload({
      jobId: job.id,
      printerId: assignment.printerId,
      restaurantId: job.restaurantId,
      orderId: job.orderId,
      ticket,
      stationId: job.stationId,
      stationName,
    }),
    executionPlan: resolved.summary,
    transportDeliveryContext,
  };
}

async function fetchAuthoritativeDiagnosticPrintJob(input: {
  agentId: string;
  wireJobId: number;
}): Promise<FetchAuthoritativePrintJobResult> {
  const assignment = getDiagnosticPrintAssignment(input.wireJobId);
  if (!assignment) {
    return { found: false, error: "Diagnostic print assignment not found" };
  }
  if (assignment.agentId !== input.agentId) {
    return { found: false, error: "Diagnostic print is not assigned to this agent" };
  }

  const resolved = resolveRuntimeExecutionPlan({
    agentId: input.agentId,
    dbPrinterId: assignment.printerId,
  });
  const transportDeliveryContext = buildTransportDeliveryContext({
    agentId: input.agentId,
    dbPrinterId: assignment.printerId,
    executionContext: resolved.context,
  });

  return {
    found: true,
    job: {
      jobId: assignment.wireJobId,
      restaurantId: assignment.restaurantId,
      printerId: assignment.printerId,
      orderId: diagnosticOrderIdForWireJob(assignment.wireJobId),
      ticket: assignment.ticket,
    },
    executionPlan: resolved.summary,
    transportDeliveryContext,
  };
}
