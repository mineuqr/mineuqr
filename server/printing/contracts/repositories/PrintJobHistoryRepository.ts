import type { PrintOperationalEventType } from "../../domain/PrintOperationalEvent";

export type PrintJobHistoryRecord = {
  id: number;
  printJobId: number;
  restaurantId: number;
  eventType: PrintOperationalEventType;
  fromStatus: string | null;
  toStatus: string;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
};

export type AppendPrintJobHistoryInput = {
  printJobId: number;
  restaurantId: number;
  eventType: PrintOperationalEventType;
  fromStatus?: string | null;
  toStatus: string;
  metadata?: Record<string, unknown> | null;
  occurredAt?: string;
};

export interface PrintJobHistoryRepository {
  append(input: AppendPrintJobHistoryInput): Promise<PrintJobHistoryRecord>;
  listByJob(printJobId: number): Promise<PrintJobHistoryRecord[]>;
}
