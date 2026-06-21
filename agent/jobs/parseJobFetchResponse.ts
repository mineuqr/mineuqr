/**
 * THERMAL-PRINTING-10A — parse authoritative job fetch responses on the agent.
 */
import {
  AGENT_JOB_MESSAGE_TYPES,
  type AgentJobFetchResponseMessage,
  type AgentJobPayload,
} from "../../shared/printing/agentJobMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import type { RuntimeExecutionPlanSummary } from "../../shared/printing/executionIntegration";
import type { TransportDeliveryContext } from "../../shared/printing/transports/transportDeliveryContext";
import type { AuthoritativePrintJob } from "./jobTypes";

export class AgentJobFetchResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentJobFetchResponseError";
  }
}

export function tryParseAgentJobFetchResponse(
  rawMessage: string
): AgentJobFetchResponseMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const message = parsed as Record<string, unknown>;
  if (message.type !== AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_RESPONSE) {
    return null;
  }

  return parseAgentJobFetchResponse(rawMessage);
}

export function parseAgentJobFetchResponse(rawMessage: string): AgentJobFetchResponseMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    throw new AgentJobFetchResponseError("Invalid job fetch response JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AgentJobFetchResponseError("Job fetch response must be an object");
  }

  const message = parsed as Record<string, unknown>;
  if (message.type !== AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_RESPONSE) {
    throw new AgentJobFetchResponseError("Not a job fetch response message");
  }
  if (message.protocolVersion !== SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION) {
    throw new AgentJobFetchResponseError(
      `Unsupported protocol version: ${String(message.protocolVersion)}`
    );
  }
  if (typeof message.requestId !== "string" || !message.requestId.trim()) {
    throw new AgentJobFetchResponseError("Job fetch response requires requestId");
  }
  if (typeof message.found !== "boolean") {
    throw new AgentJobFetchResponseError("Job fetch response requires found flag");
  }

  const response: AgentJobFetchResponseMessage = {
    type: AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_RESPONSE,
    protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    requestId: message.requestId,
    found: message.found,
  };

  if (!message.found) {
    response.error = typeof message.error === "string" ? message.error : "Print job not found";
    return response;
  }

  response.job = parseAgentJobPayload(message.job);
  if (message.executionPlan && typeof message.executionPlan === "object") {
    response.executionPlan = message.executionPlan as RuntimeExecutionPlanSummary;
  }
  if (
    message.transportDeliveryContext &&
    typeof message.transportDeliveryContext === "object"
  ) {
    response.transportDeliveryContext =
      message.transportDeliveryContext as TransportDeliveryContext;
  }

  return response;
}

function parseAgentJobPayload(value: unknown): AgentJobPayload {
  if (!value || typeof value !== "object") {
    throw new AgentJobFetchResponseError("Job fetch response requires job payload");
  }

  const job = value as Record<string, unknown>;
  if (!Number.isInteger(job.jobId) || (job.jobId as number) <= 0) {
    throw new AgentJobFetchResponseError("Invalid jobId in fetch response");
  }
  if (!Number.isInteger(job.printerId) || (job.printerId as number) <= 0) {
    throw new AgentJobFetchResponseError("Invalid printerId in fetch response");
  }
  if (!Number.isInteger(job.restaurantId) || (job.restaurantId as number) <= 0) {
    throw new AgentJobFetchResponseError("Invalid restaurantId in fetch response");
  }
  if (!Number.isInteger(job.orderId) || (job.orderId as number) <= 0) {
    throw new AgentJobFetchResponseError("Invalid orderId in fetch response");
  }
  if (!job.ticket || typeof job.ticket !== "object") {
    throw new AgentJobFetchResponseError("Invalid ticket in fetch response");
  }

  const ticket = job.ticket as Record<string, unknown>;
  if (!Number.isInteger(ticket.orderId) || (ticket.orderId as number) <= 0) {
    throw new AgentJobFetchResponseError("Invalid ticket.orderId in fetch response");
  }
  if (!Number.isInteger(ticket.restaurantId) || (ticket.restaurantId as number) <= 0) {
    throw new AgentJobFetchResponseError("Invalid ticket.restaurantId in fetch response");
  }
  if (!Array.isArray(ticket.items) || ticket.items.length === 0) {
    throw new AgentJobFetchResponseError("Invalid ticket items in fetch response");
  }

  return {
    jobId: job.jobId as number,
    restaurantId: job.restaurantId as number,
    printerId: job.printerId as number,
    orderId: job.orderId as number,
    ticket: {
      orderId: ticket.orderId as number,
      restaurantId: ticket.restaurantId as number,
      items: ticket.items.map((item) => {
        if (!item || typeof item !== "object") {
          throw new AgentJobFetchResponseError("Invalid ticket item in fetch response");
        }
        const row = item as Record<string, unknown>;
        if (typeof row.itemName !== "string" || !row.itemName.trim()) {
          throw new AgentJobFetchResponseError("Invalid itemName in fetch response");
        }
        if (!Number.isInteger(row.quantity) || (row.quantity as number) <= 0) {
          throw new AgentJobFetchResponseError("Invalid quantity in fetch response");
        }
        return {
          itemName: row.itemName,
          quantity: row.quantity as number,
          notes: typeof row.notes === "string" ? row.notes : row.notes ?? null,
        };
      }),
    },
  };
}

export function mapFetchResponseToAuthoritativePrintJob(
  response: AgentJobFetchResponseMessage
): AuthoritativePrintJob | null {
  if (!response.found || !response.job) {
    return null;
  }

  return {
    jobId: response.job.jobId,
    restaurantId: response.job.restaurantId,
    printerId: response.job.printerId,
    orderId: response.job.orderId,
    ticket: response.job.ticket,
    executionPlan: response.executionPlan ? { ...response.executionPlan } : undefined,
    transportDeliveryContext: response.transportDeliveryContext
      ? {
          executionContext: response.transportDeliveryContext.executionContext,
          printerProfile: { ...response.transportDeliveryContext.printerProfile },
        }
      : undefined,
  };
}
