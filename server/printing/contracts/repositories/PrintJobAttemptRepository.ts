import type { PrintJobStatus } from "../../domain/PrintJobStatus";

export type PrintJobAttemptRecord = {
  id: number;
  printJobId: number;
  restaurantId: number;
  attemptNumber: number;
  status: PrintJobStatus;
  outcome: "in_progress" | "success" | "failure" | "cancelled";
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type CreatePrintJobAttemptInput = {
  printJobId: number;
  restaurantId: number;
  attemptNumber: number;
  status: PrintJobStatus;
  outcome: PrintJobAttemptRecord["outcome"];
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

export interface PrintJobAttemptRepository {
  create(input: CreatePrintJobAttemptInput): Promise<PrintJobAttemptRecord>;
  listByJob(printJobId: number): Promise<PrintJobAttemptRecord[]>;
}
