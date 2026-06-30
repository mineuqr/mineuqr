import type { PrintFailureReason } from "./PrintFailureReason";

export type PrintExecutionResult = {
  executionId: string;
  printJobId: number;
  restaurantId: number;
  printerId: string;
  success: boolean;
  failureReason?: PrintFailureReason | null;
  message?: string | null;
  completedAt: string;
};
