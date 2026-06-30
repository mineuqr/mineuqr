import type { PrintPayload } from "../../domain/PrintPayload";

export type PrintConnectorSubmission = {
  jobId: number;
  restaurantId: number;
  orderId: number;
  correlationId: string | null;
  payload: PrintPayload;
};

export type PrintConnectorSubmissionResult = {
  executionId: string | null;
};

export type PrintConnectorCancelRequest = {
  jobId: number;
  restaurantId: number;
  executionId: string | null;
};

/**
 * PRINTING-1 — integration port only. No connector implementation in this program.
 */
export interface PrintConnectorPort {
  submit(submission: PrintConnectorSubmission): Promise<PrintConnectorSubmissionResult>;
  cancel(request: PrintConnectorCancelRequest): Promise<void>;
}
