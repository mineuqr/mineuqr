import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { printJobHistory } from "../../../../drizzle/schema";
import type {
  AppendPrintJobHistoryInput,
  PrintJobHistoryRecord,
  PrintJobHistoryRepository,
} from "../../contracts/repositories/PrintJobHistoryRepository";
import type { PrintOperationalEventType } from "../../domain/PrintOperationalEvent";

function mapRow(row: typeof printJobHistory.$inferSelect): PrintJobHistoryRecord {
  return {
    id: row.id,
    printJobId: row.printJobId,
    restaurantId: row.restaurantId,
    eventType: row.eventType as PrintOperationalEventType,
    fromStatus: row.fromStatus ?? null,
    toStatus: row.toStatus,
    metadata: (row.metadataJson as Record<string, unknown> | null) ?? null,
    occurredAt: row.occurredAt,
  };
}

export class DrizzlePrintJobHistoryRepository implements PrintJobHistoryRepository {
  async append(input: AppendPrintJobHistoryInput): Promise<PrintJobHistoryRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const occurredAt = input.occurredAt ?? new Date().toISOString();

    const result = await db.insert(printJobHistory).values({
      printJobId: input.printJobId,
      restaurantId: input.restaurantId,
      eventType: input.eventType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      metadataJson: input.metadata ?? null,
      occurredAt,
    });

    const insertId = Number(result[0].insertId);
    const [row] = await db
      .select()
      .from(printJobHistory)
      .where(eq(printJobHistory.id, insertId))
      .limit(1);

    if (!row) throw new Error("Failed to load print job history row");
    return mapRow(row);
  }

  async listByJob(printJobId: number): Promise<PrintJobHistoryRecord[]> {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(printJobHistory)
      .where(eq(printJobHistory.printJobId, printJobId))
      .orderBy(asc(printJobHistory.occurredAt));

    return rows.map(mapRow);
  }
}
