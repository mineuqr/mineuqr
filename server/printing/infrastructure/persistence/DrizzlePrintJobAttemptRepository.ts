import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { printJobAttempts } from "../../../../drizzle/schema";
import type {
  CreatePrintJobAttemptInput,
  PrintJobAttemptRecord,
  PrintJobAttemptRepository,
} from "../../contracts/repositories/PrintJobAttemptRepository";
import type { PrintJobStatus } from "../../domain/PrintJobStatus";

function mapRow(row: typeof printJobAttempts.$inferSelect): PrintJobAttemptRecord {
  return {
    id: row.id,
    printJobId: row.printJobId,
    restaurantId: row.restaurantId,
    attemptNumber: row.attemptNumber,
    status: row.status as PrintJobStatus,
    outcome: row.outcome,
    errorMessage: row.errorMessage ?? null,
    metadata: (row.metadataJson as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
  };
}

export class DrizzlePrintJobAttemptRepository implements PrintJobAttemptRepository {
  async create(input: CreatePrintJobAttemptInput): Promise<PrintJobAttemptRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const result = await db.insert(printJobAttempts).values({
      printJobId: input.printJobId,
      restaurantId: input.restaurantId,
      attemptNumber: input.attemptNumber,
      status: input.status,
      outcome: input.outcome,
      errorMessage: input.errorMessage ?? null,
      metadataJson: input.metadata ?? null,
    });

    const insertId = Number(result[0].insertId);
    const [row] = await db
      .select()
      .from(printJobAttempts)
      .where(eq(printJobAttempts.id, insertId))
      .limit(1);

    if (!row) throw new Error("Failed to load created print job attempt");
    return mapRow(row);
  }

  async listByJob(printJobId: number): Promise<PrintJobAttemptRecord[]> {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(printJobAttempts)
      .where(eq(printJobAttempts.printJobId, printJobId))
      .orderBy(asc(printJobAttempts.attemptNumber));

    return rows.map(mapRow);
  }
}
