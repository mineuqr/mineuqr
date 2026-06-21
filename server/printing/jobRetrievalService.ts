/**
 * THERMAL-PRINTING-7A.3 / 10B — authoritative print job retrieval for assigned agents.
 */
import type { AgentJobPayload } from "../../shared/printing/agentJobMessages";
import type { RuntimeExecutionPlanSummary } from "../../shared/printing/executionIntegration";
import type { TransportDeliveryContext } from "../../shared/printing/transports/transportDeliveryContext";
import { getAgent } from "./agentRegistry";
import { getPrintJobAssignment } from "./assignmentService";
import { resolveRuntimeExecutionPlan } from "./executionIntegrationFlow";
import { findPrintJobById } from "./printJobRepository";
import { renderKitchenTicket } from "./ticketRenderer";
import { buildTransportDeliveryContext } from "./transportDeliveryContextBuilder";

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
}): AgentJobPayload {
  return {
    jobId: input.jobId,
    restaurantId: input.restaurantId,
    printerId: input.printerId,
    orderId: input.orderId,
    ticket: {
      orderId: input.ticket.orderId,
      restaurantId: input.ticket.restaurantId,
      items: input.ticket.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        notes: item.notes,
      })),
    },
  };
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

  const assignment = getPrintJobAssignment(input.jobId);
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

  const ticket = await renderKitchenTicket({ orderId: job.orderId });
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
    }),
    executionPlan: resolved.summary,
    transportDeliveryContext,
  };
}
