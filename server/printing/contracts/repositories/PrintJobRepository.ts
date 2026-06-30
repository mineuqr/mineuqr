import type { PrintJobSource, PrintJobStatus } from "../../domain/PrintJobStatus";
import type { PrintPayload } from "../../domain/PrintPayload";

export type PrintJobRecord = {
  id: number;
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  status: PrintJobStatus;
  source: PrintJobSource;
  idempotencyKey: string;
  triggerEventType: string | null;
  triggerEventId: string | null;
  correlationId: string | null;
  payloadVersion: number;
  payload: PrintPayload;
  attemptCount: number;
  lastError: string | null;
  operatorUserId: number | null;
  createdAt: string;
  updatedAt: string;
  dispatchedAt: string | null;
  printingAt: string | null;
  completedAt: string | null;
};

export type CreatePrintJobInput = {
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  source: PrintJobSource;
  idempotencyKey: string;
  triggerEventType?: string | null;
  triggerEventId?: string | null;
  correlationId?: string | null;
  payload: PrintPayload;
  operatorUserId?: number | null;
};

export type UpdatePrintJobStatusInput = {
  jobId: number;
  restaurantId: number;
  fromStatus: PrintJobStatus;
  toStatus: PrintJobStatus;
  lastError?: string | null;
  dispatchedAt?: string | null;
  printingAt?: string | null;
  completedAt?: string | null;
  incrementAttempt?: boolean;
};

export interface PrintJobRepository {
  create(input: CreatePrintJobInput): Promise<PrintJobRecord>;
  findById(jobId: number, restaurantId: number): Promise<PrintJobRecord | null>;
  findByIdempotencyKey(
    restaurantId: number,
    idempotencyKey: string
  ): Promise<PrintJobRecord | null>;
  listByOrder(restaurantId: number, orderId: number): Promise<PrintJobRecord[]>;
  updateStatus(input: UpdatePrintJobStatusInput): Promise<PrintJobRecord | null>;
}
