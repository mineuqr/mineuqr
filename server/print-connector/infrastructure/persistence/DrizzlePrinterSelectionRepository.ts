import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { printConnectorSelections } from "../../../../drizzle/schema";
import type {
  PrinterSelectionRepository,
  SavePrinterSelectionInput,
} from "../../contracts/PrinterSelectionRepository";
import type { SelectedPrinterDto } from "../../contracts/PrintConnectorApi";

function mapRow(row: typeof printConnectorSelections.$inferSelect): SelectedPrinterDto {
  return {
    restaurantId: row.restaurantId,
    printerId: row.printerId,
    printerName: row.printerName,
    platform: row.platform,
    transport: row.transport,
    selectedAt: row.selectedAt,
  };
}

export class DrizzlePrinterSelectionRepository implements PrinterSelectionRepository {
  async getSelected(restaurantId: number): Promise<SelectedPrinterDto | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(printConnectorSelections)
      .where(eq(printConnectorSelections.restaurantId, restaurantId))
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async saveSelection(input: SavePrinterSelectionInput): Promise<SelectedPrinterDto> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const selectedAt = new Date().toISOString();

    await db
      .insert(printConnectorSelections)
      .values({
        restaurantId: input.restaurantId,
        printerId: input.printerId,
        printerName: input.printerName,
        platform: input.platform,
        transport: input.transport,
        selectedAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          printerId: input.printerId,
          printerName: input.printerName,
          platform: input.platform,
          transport: input.transport,
          selectedAt,
        },
      });

    const saved = await this.getSelected(input.restaurantId);
    if (!saved) throw new Error("Failed to persist printer selection");
    return saved;
  }
}
