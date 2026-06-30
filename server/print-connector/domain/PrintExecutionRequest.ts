import type { PrintPayload } from "../../printing/domain/PrintPayload";

export type PrintExecutionRequest = {
  executionId: string;
  restaurantId: number;
  printJobId: number;
  orderId: number;
  printerId: string;
  payload: PrintPayload;
  requestedAt: string;
};
