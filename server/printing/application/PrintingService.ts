import type { PrintConnectorPort } from "../contracts/ports/PrintConnectorPort";
import type { PrintStatusPublisher } from "../contracts/ports/PrintStatusPublisher";
import type { PrintPayloadBuilderPort } from "../contracts/PrintPayloadBuilderPort";
import type { PrintJobAttemptRepository } from "../contracts/repositories/PrintJobAttemptRepository";
import type { PrintJobHistoryRepository } from "../contracts/repositories/PrintJobHistoryRepository";
import type { PrintJobRecord, PrintJobRepository } from "../contracts/repositories/PrintJobRepository";
import {
  PRINT_OPERATIONAL_EVENTS,
  type PrintOperationalEventType,
} from "../domain/PrintOperationalEvent";
import type { PrintPayload } from "../domain/PrintPayload";
import {
  canTransitionPrintJobStatus,
  type PrintJobStatus,
} from "../domain/PrintJobStatus";

export class PrintDispatchCoordinator {
  constructor(
    private readonly jobs: PrintJobRepository,
    private readonly attempts: PrintJobAttemptRepository,
    private readonly history: PrintJobHistoryRepository,
    private readonly connector: PrintConnectorPort,
    private readonly publisher: PrintStatusPublisher
  ) {}

  async dispatchPendingJob(job: PrintJobRecord): Promise<PrintJobRecord> {
    if (job.status !== "pending") return job;

    const dispatched = await this.transition(job, "dispatched", "PrintDispatched");
    if (!dispatched) return job;

    const printing = await this.transition(dispatched, "printing", "PrintStarted");
    if (!printing) return dispatched;

    await this.connector.submit({
      jobId: printing.id,
      restaurantId: printing.restaurantId,
      orderId: printing.orderId,
      correlationId: printing.correlationId,
      payload: printing.payload,
    });

    return printing;
  }

  private async transition(
    job: PrintJobRecord,
    toStatus: PrintJobStatus,
    eventType: PrintOperationalEventType
  ): Promise<PrintJobRecord | null> {
    if (!canTransitionPrintJobStatus(job.status, toStatus)) return null;

    const now = new Date().toISOString();
    const updated = await this.jobs.updateStatus({
      jobId: job.id,
      restaurantId: job.restaurantId,
      fromStatus: job.status,
      toStatus,
      dispatchedAt: toStatus === "dispatched" ? now : undefined,
      printingAt: toStatus === "printing" ? now : undefined,
      incrementAttempt: toStatus === "dispatched",
    });

    if (!updated) return null;

    const attemptNumber = updated.attemptCount;
    await this.attempts.create({
      printJobId: updated.id,
      restaurantId: updated.restaurantId,
      attemptNumber,
      status: toStatus,
      outcome: toStatus === "printed" ? "success" : "in_progress",
    });

    await this.recordHistory(updated, eventType, job.status, toStatus);

    await this.publisher.publish({
      eventType,
      printJobId: updated.id,
      restaurantId: updated.restaurantId,
      orderId: updated.orderId,
      orderNumber: updated.orderNumber,
      fromStatus: job.status,
      toStatus,
      occurredAt: now,
    });

    return updated;
  }

  private async recordHistory(
    job: PrintJobRecord,
    eventType: PrintOperationalEventType,
    fromStatus: PrintJobStatus,
    toStatus: PrintJobStatus,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.history.append({
      printJobId: job.id,
      restaurantId: job.restaurantId,
      eventType,
      fromStatus,
      toStatus,
      metadata,
    });
  }
}

export type RequestPrintParams = {
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  source: PrintJobRecord["source"];
  idempotencyKey: string;
  triggerEventType?: string | null;
  triggerEventId?: string | null;
  correlationId?: string | null;
  operatorUserId?: number | null;
  reason?: string | null;
  payload: PrintPayload;
  dispatch?: boolean;
};

export class PrintingService {
  constructor(
    private readonly jobs: PrintJobRepository,
    private readonly attempts: PrintJobAttemptRepository,
    private readonly history: PrintJobHistoryRepository,
    private readonly payloadBuilder: PrintPayloadBuilderPort,
    private readonly dispatchCoordinator: PrintDispatchCoordinator,
    private readonly publisher: PrintStatusPublisher
  ) {}

  async requestPrint(params: RequestPrintParams): Promise<PrintJobRecord> {
    const existing = await this.jobs.findByIdempotencyKey(
      params.restaurantId,
      params.idempotencyKey
    );
    if (existing) {
      if (params.dispatch && existing.status === "pending") {
        return (await this.dispatchCoordinator.dispatchPendingJob(existing)) ?? existing;
      }
      return existing;
    }

    const job = await this.jobs.create({
      restaurantId: params.restaurantId,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      source: params.source,
      idempotencyKey: params.idempotencyKey,
      triggerEventType: params.triggerEventType ?? null,
      triggerEventId: params.triggerEventId ?? null,
      correlationId: params.correlationId ?? null,
      payload: params.payload,
      operatorUserId: params.operatorUserId ?? null,
    });

    await this.attempts.create({
      printJobId: job.id,
      restaurantId: job.restaurantId,
      attemptNumber: 0,
      status: "pending",
      outcome: "in_progress",
      metadata: params.reason ? { reason: params.reason } : null,
    });

    const now = new Date().toISOString();
    await this.history.append({
      printJobId: job.id,
      restaurantId: job.restaurantId,
      eventType: PRINT_OPERATIONAL_EVENTS.PrintRequested,
      fromStatus: null,
      toStatus: "pending",
      metadata: params.reason ? { reason: params.reason } : null,
      occurredAt: now,
    });

    await this.publisher.publish({
      eventType: PRINT_OPERATIONAL_EVENTS.PrintRequested,
      printJobId: job.id,
      restaurantId: job.restaurantId,
      orderId: job.orderId,
      orderNumber: job.orderNumber,
      fromStatus: null,
      toStatus: "pending",
      occurredAt: now,
      metadata: params.reason ? { reason: params.reason } : undefined,
    });

    if (params.dispatch !== false) {
      return (await this.dispatchCoordinator.dispatchPendingJob(job)) ?? job;
    }

    return job;
  }

  async buildPayloadForOrder(input: {
    restaurantId: number;
    orderId: number;
    source: PrintJobRecord["source"];
    eventType?: string | null;
    eventId?: string | null;
    operatorUserId?: number | null;
    reason?: string | null;
  }): Promise<PrintPayload | null> {
    return this.payloadBuilder.build({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
      trigger: {
        source: input.source,
        eventType: input.eventType ?? null,
        eventId: input.eventId ?? null,
        operatorUserId: input.operatorUserId ?? null,
        reason: input.reason ?? null,
      },
    });
  }

  async listJobsForOrder(restaurantId: number, orderId: number): Promise<PrintJobRecord[]> {
    return this.jobs.listByOrder(restaurantId, orderId);
  }

  async markPrinted(input: {
    restaurantId: number;
    orderId: number;
    jobId: number;
    operatorUserId: number;
    printedAt?: string;
  }): Promise<PrintJobRecord | null> {
    const job = await this.jobs.findById(input.jobId, input.restaurantId);
    if (!job || job.orderId !== input.orderId) return null;
    if (!["dispatched", "printing"].includes(job.status)) return null;

    return this.completeJob(job, "printed", PRINT_OPERATIONAL_EVENTS.PrintCompleted, {
      operatorUserId: input.operatorUserId,
      printedAt: input.printedAt ?? new Date().toISOString(),
      manual: true,
    });
  }

  async cancelPrint(input: {
    restaurantId: number;
    orderId: number;
    jobId: number;
    operatorUserId: number;
    reason?: string;
  }): Promise<PrintJobRecord | null> {
    const job = await this.jobs.findById(input.jobId, input.restaurantId);
    if (!job || job.orderId !== input.orderId) return null;
    if (!["pending", "dispatched", "printing"].includes(job.status)) return null;

    return this.completeJob(job, "cancelled", PRINT_OPERATIONAL_EVENTS.PrintCancelled, {
      operatorUserId: input.operatorUserId,
      reason: input.reason ?? null,
    });
  }

  async reportPrintSuccess(input: {
    jobId: number;
    restaurantId: number;
  }): Promise<PrintJobRecord | null> {
    const job = await this.jobs.findById(input.jobId, input.restaurantId);
    if (!job || job.status !== "printing") return null;

    return this.completeJob(job, "printed", PRINT_OPERATIONAL_EVENTS.PrintCompleted, {
      connectorReported: true,
    });
  }

  async reportPrintFailure(input: {
    jobId: number;
    restaurantId: number;
    error: string;
  }): Promise<PrintJobRecord | null> {
    const job = await this.jobs.findById(input.jobId, input.restaurantId);
    if (!job || !["dispatched", "printing"].includes(job.status)) return null;

    return this.completeJob(job, "failed", PRINT_OPERATIONAL_EVENTS.PrintFailed, {
      error: input.error,
    }, input.error);
  }

  async reportPrintingStarted(input: {
    jobId: number;
    restaurantId: number;
  }): Promise<PrintJobRecord | null> {
    const job = await this.jobs.findById(input.jobId, input.restaurantId);
    if (!job || job.status !== "dispatched") return null;

    return this.transitionOperational(job, "printing", PRINT_OPERATIONAL_EVENTS.PrintStarted);
  }

  private async completeJob(
    job: PrintJobRecord,
    toStatus: "printed" | "failed" | "cancelled",
    eventType: PrintOperationalEventType,
    metadata?: Record<string, unknown>,
    lastError?: string
  ): Promise<PrintJobRecord | null> {
    if (!canTransitionPrintJobStatus(job.status, toStatus)) return null;

    const now = new Date().toISOString();
    const updated = await this.jobs.updateStatus({
      jobId: job.id,
      restaurantId: job.restaurantId,
      fromStatus: job.status,
      toStatus,
      completedAt: now,
      lastError: lastError ?? null,
    });

    if (!updated) return null;

    await this.attempts.create({
      printJobId: updated.id,
      restaurantId: updated.restaurantId,
      attemptNumber: updated.attemptCount,
      status: toStatus,
      outcome: toStatus === "printed" ? "success" : toStatus === "cancelled" ? "cancelled" : "failure",
      errorMessage: lastError ?? null,
      metadata: metadata ?? null,
    });

    await this.history.append({
      printJobId: updated.id,
      restaurantId: updated.restaurantId,
      eventType,
      fromStatus: job.status,
      toStatus,
      metadata: metadata ?? null,
      occurredAt: now,
    });

    await this.publisher.publish({
      eventType,
      printJobId: updated.id,
      restaurantId: updated.restaurantId,
      orderId: updated.orderId,
      orderNumber: updated.orderNumber,
      fromStatus: job.status,
      toStatus,
      occurredAt: now,
      metadata,
    });

    return updated;
  }

  private async transitionOperational(
    job: PrintJobRecord,
    toStatus: PrintJobStatus,
    eventType: PrintOperationalEventType,
    metadata?: Record<string, unknown>
  ): Promise<PrintJobRecord | null> {
    if (!canTransitionPrintJobStatus(job.status, toStatus)) return null;

    const now = new Date().toISOString();
    const updated = await this.jobs.updateStatus({
      jobId: job.id,
      restaurantId: job.restaurantId,
      fromStatus: job.status,
      toStatus,
      printingAt: toStatus === "printing" ? now : undefined,
    });

    if (!updated) return null;

    await this.attempts.create({
      printJobId: updated.id,
      restaurantId: updated.restaurantId,
      attemptNumber: updated.attemptCount,
      status: toStatus,
      outcome: "in_progress",
      metadata: metadata ?? null,
    });

    await this.history.append({
      printJobId: updated.id,
      restaurantId: updated.restaurantId,
      eventType,
      fromStatus: job.status,
      toStatus,
      metadata: metadata ?? null,
      occurredAt: now,
    });

    await this.publisher.publish({
      eventType,
      printJobId: updated.id,
      restaurantId: updated.restaurantId,
      orderId: updated.orderId,
      orderNumber: updated.orderNumber,
      fromStatus: job.status,
      toStatus,
      occurredAt: now,
      metadata,
    });

    return updated;
  }
}
