/**
 * THERMAL-PRINTING-13I.3C.3 — immutable per-job correlation identifier.
 */
import { randomUUID } from "node:crypto";
import type { SelectPrintJob } from "../../drizzle/schema";
import { findPrintJobById } from "./printJobRepository";
import {
  assignPrintJobCorrelationId,
  findPrintJobCorrelationId,
} from "./printJobTelemetryRepository";

export function generatePrintJobCorrelationId(): string {
  return randomUUID();
}

export async function ensurePrintJobCorrelationId(
  job: Pick<SelectPrintJob, "id" | "correlationId">
): Promise<string> {
  const existing = job.correlationId?.trim();
  if (existing) {
    return existing;
  }

  const stored = await findPrintJobCorrelationId(job.id);
  if (stored?.trim()) {
    return stored.trim();
  }

  const correlationId = generatePrintJobCorrelationId();
  return assignPrintJobCorrelationId(job.id, correlationId);
}

export async function resolvePrintJobCorrelationIdForJobId(
  printJobId: number
): Promise<string | null> {
  const job = await findPrintJobById(printJobId);
  if (!job) {
    return null;
  }
  return ensurePrintJobCorrelationId(job);
}

export async function bindPrintJobCorrelationIdAtCreation(
  printJobId: number,
  correlationId?: string
): Promise<string> {
  const id = correlationId?.trim() || generatePrintJobCorrelationId();
  return assignPrintJobCorrelationId(printJobId, id);
}
