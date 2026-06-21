/**
 * THERMAL-PRINTING-6D Phase-2 — local execution pipeline (prepare only, no printing).
 */
import {
  normalizeAuthoritativePrintJob,
  validateAuthoritativePrintJob,
  type AuthoritativePrintJob,
} from "../jobs/jobTypes";
import { LocalJobStore } from "./localJobStore";
import { assertLocalJobStateTransition } from "./stateMachine";
import type { ExecutionContext, LocalJobRecord } from "./executionTypes";

export class ExecutionPipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionPipelineError";
  }
}

export type ExecutionPipelineOptions = {
  store?: LocalJobStore;
  now?: () => Date;
};

export class ExecutionPipeline {
  private readonly store: LocalJobStore;
  private readonly now: () => Date;

  constructor(options: ExecutionPipelineOptions = {}) {
    this.store = options.store ?? new LocalJobStore();
    this.now = options.now ?? (() => new Date());
  }

  getStore(): LocalJobStore {
    return this.store;
  }

  receive(job: AuthoritativePrintJob): LocalJobRecord {
    const normalized = normalizeAuthoritativePrintJob(job);
    const existing = this.store.get(normalized.jobId);
    if (existing) {
      return existing;
    }
    return this.store.createReceived(normalized, this.now().toISOString());
  }

  validate(jobId: number): LocalJobRecord {
    const record = this.requireRecord(jobId);
    assertLocalJobStateTransition(record.state, "validated");
    const payload = this.requirePayload(jobId);
    validateAuthoritativePrintJob(payload);
    return this.store.transition(jobId, "validated", this.now().toISOString());
  }

  prepare(jobId: number): LocalJobRecord {
    const record = this.requireRecord(jobId);
    assertLocalJobStateTransition(record.state, "prepared");
    const payload = this.requirePayload(jobId);

    const context: ExecutionContext = {
      jobId: payload.jobId,
      restaurantId: payload.restaurantId,
      printerId: payload.printerId,
      orderId: payload.orderId,
      ticketItemCount: payload.ticket.items.length,
      normalizedAt: this.now().toISOString(),
    };

    return this.store.transition(jobId, "prepared", context.normalizedAt, context);
  }

  markAcknowledged(jobId: number): LocalJobRecord {
    const record = this.requireRecord(jobId);
    assertLocalJobStateTransition(record.state, "acknowledged");
    return this.store.transition(jobId, "acknowledged", this.now().toISOString());
  }

  runThroughPrepare(job: AuthoritativePrintJob): LocalJobRecord {
    const received = this.receive(job);
    if (received.state === "acknowledged" || received.state === "prepared") {
      return received;
    }
    if (received.state === "received") {
      this.validate(job.jobId);
    }
    return this.prepare(job.jobId);
  }

  private requireRecord(jobId: number): LocalJobRecord {
    const record = this.store.get(jobId);
    if (!record) {
      throw new ExecutionPipelineError(`Local job not found: ${jobId}`);
    }
    return record;
  }

  private requirePayload(jobId: number): AuthoritativePrintJob {
    const payload = this.store.getPayload(jobId);
    if (!payload) {
      throw new ExecutionPipelineError(`Job payload not found: ${jobId}`);
    }
    return payload;
  }
}
