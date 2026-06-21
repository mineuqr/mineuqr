/**
 * THERMAL-PRINTING-6D Phase-2 — in-memory local job runtime store (not persisted).
 */
import type { AuthoritativePrintJob } from "../jobs/jobTypes";
import type { LocalJobPrepareContext, LocalJobRecord, LocalJobState } from "./executionTypes";

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
    return stored ? { ...stored.record, prepareContext: stored.record.prepareContext ? { ...stored.record.prepareContext } : undefined } : undefined;
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

  transition(jobId: number, state: LocalJobState, updatedAt: string, prepareContext?: LocalJobPrepareContext): LocalJobRecord {
    const stored = this.jobs.get(jobId);
    if (!stored) {
      throw new Error(`Local job not found: ${jobId}`);
    }

    const next: LocalJobRecord = {
      ...stored.record,
      state,
      updatedAt,
      prepareContext: prepareContext ?? stored.record.prepareContext,
    };
    stored.record = next;
    return { ...next, prepareContext: next.prepareContext ? { ...next.prepareContext } : undefined };
  }

  list(): LocalJobRecord[] {
    return Array.from(this.jobs.values()).map(({ record }) => ({
      ...record,
      prepareContext: record.prepareContext ? { ...record.prepareContext } : undefined,
    }));
  }

  clear(): void {
    this.jobs.clear();
  }
}
