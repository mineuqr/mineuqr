/**
 * THERMAL-PRINTING-6D Phase-2 — authoritative print job types (agent consumption).
 */
import type { AgentJobTicketPayload } from "../../shared/printing/agentJobMessages";

export interface AgentJobTicket extends AgentJobTicketPayload {}

export interface AuthoritativePrintJob {
  jobId: number;
  restaurantId: number;
  printerId: number;
  orderId: number;
  ticket: AgentJobTicket;
}

export class AgentJobValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentJobValidationError";
  }
}

export function validateAuthoritativePrintJob(job: AuthoritativePrintJob): void {
  if (!Number.isInteger(job.jobId) || job.jobId <= 0) {
    throw new AgentJobValidationError("Invalid jobId");
  }
  if (!Number.isInteger(job.printerId) || job.printerId <= 0) {
    throw new AgentJobValidationError("Invalid printerId");
  }
  if (!Number.isInteger(job.restaurantId) || job.restaurantId <= 0) {
    throw new AgentJobValidationError("Invalid restaurantId");
  }
  if (!Number.isInteger(job.orderId) || job.orderId <= 0) {
    throw new AgentJobValidationError("Invalid orderId");
  }
  if (!job.ticket || typeof job.ticket !== "object") {
    throw new AgentJobValidationError("Ticket is required");
  }
  if (!Number.isInteger(job.ticket.orderId) || job.ticket.orderId <= 0) {
    throw new AgentJobValidationError("Invalid ticket.orderId");
  }
  if (!Array.isArray(job.ticket.items) || job.ticket.items.length === 0) {
    throw new AgentJobValidationError("Ticket items are required");
  }
}

export function normalizeAuthoritativePrintJob(job: AuthoritativePrintJob): AuthoritativePrintJob {
  validateAuthoritativePrintJob(job);
  return {
    jobId: job.jobId,
    restaurantId: job.restaurantId,
    printerId: job.printerId,
    orderId: job.orderId,
    ticket: {
      orderId: job.ticket.orderId,
      restaurantId: job.ticket.restaurantId,
      items: job.ticket.items.map((item) => ({
        itemName: item.itemName.trim(),
        quantity: item.quantity,
        notes: item.notes ?? null,
      })),
    },
  };
}
