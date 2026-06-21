/**
 * THERMAL-PRINTING-6D Phase-2 — in-memory local job runtime store (not persisted).
 */
import type { AuthoritativePrintJob } from "../jobs/jobTypes";
import type { ExecutionContext, LocalJobRecord, LocalJobState } from "./executionTypes";

type StoredLocalJob = {
  record: LocalJobRecord;
  payload?: AuthoritativePrintJob;
};

export class LocalJobStore {
  private readonly jobs = new Map<number, StoredLocalJob>();

  createReceived(job: AuthoritativePrintJob, receivedAt: string): LocalJobRecord {
    const record: LocalJobRecord = {
      jobId: job.jobId,
      state: "received",
      receivedAt,
      updatedAt: receivedAt,
    };
    this.jobs.set(job.jobId, {
      record,
      payload: { ...job, ticket: { ...job.ticket, items: [...job.ticket.items] } },
    });
    return { ...record };
  }

  get(jobId: number): LocalJobRecord | undefined {
    const stored = this.jobs.get(jobId);
    return stored ? { ...stored.record, context: stored.record.context ? { ...stored.record.context } : undefined } : undefined;
  }

  getPayload(jobId: number): AuthoritativePrintJob | undefined {
    const stored = this.jobs.get(jobId);
    if (!stored?.payload) {
      return undefined;
    }
    return {
      ...stored.payload,
      ticket: { ...stored.payload.ticket, items: [...stored.payload.ticket.items] },
    };
  }

  transition(jobId: number, state: LocalJobState, updatedAt: string, context?: ExecutionContext): LocalJobRecord {
    const stored = this.jobs.get(jobId);
    if (!stored) {
      throw new Error(`Local job not found: ${jobId}`);
    }

    const next: LocalJobRecord = {
      ...stored.record,
      state,
      updatedAt,
      context: context ?? stored.record.context,
    };
    stored.record = next;
    return { ...next, context: next.context ? { ...next.context } : undefined };
  }

  list(): LocalJobRecord[] {
    return Array.from(this.jobs.values()).map(({ record }) => ({
      ...record,
      context: record.context ? { ...record.context } : undefined,
    }));
  }

  clear(): void {
    this.jobs.clear();
  }
}
