import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { restaurantPrinters } from "../../../drizzle/schema";
import type { PrinterCapability } from "../../print-connector/domain/PrinterCapability";
import type { RestaurantPrinterDto } from "../contracts/printerManagementContracts";
import type {
  RestaurantPrinterRepository,
  SaveRestaurantPrinterInput,
} from "../contracts/RestaurantPrinterRepository";

function mapRow(row: typeof restaurantPrinters.$inferSelect): RestaurantPrinterDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    printerId: row.printerId,
    displayName: row.displayName,
    platform: row.platform,
    transport: row.transport,
    isDefault: row.isDefault,
    isActive: row.isActive,
    lastValidatedAt: row.lastValidatedAt ?? null,
    capabilities: (row.capabilitiesJson as PrinterCapability | null) ?? null,
  };
}

export class DrizzleRestaurantPrinterRepository implements RestaurantPrinterRepository {
  async listByRestaurant(restaurantId: number): Promise<RestaurantPrinterDto[]> {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(restaurantPrinters)
      .where(and(eq(restaurantPrinters.restaurantId, restaurantId), eq(restaurantPrinters.isActive, true)))
      .orderBy(desc(restaurantPrinters.isDefault), desc(restaurantPrinters.updatedAt));

    return rows.map(mapRow);
  }

  async findByPrinterId(restaurantId: number, printerId: string): Promise<RestaurantPrinterDto | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(restaurantPrinters)
      .where(
        and(
          eq(restaurantPrinters.restaurantId, restaurantId),
          eq(restaurantPrinters.printerId, printerId),
          eq(restaurantPrinters.isActive, true)
        )
      )
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async getDefault(restaurantId: number): Promise<RestaurantPrinterDto | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(restaurantPrinters)
      .where(
        and(
          eq(restaurantPrinters.restaurantId, restaurantId),
          eq(restaurantPrinters.isDefault, true),
          eq(restaurantPrinters.isActive, true)
        )
      )
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async save(input: SaveRestaurantPrinterInput): Promise<RestaurantPrinterDto> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const existing = await this.findByPrinterId(input.restaurantId, input.printerId);
    const shouldDefault =
      input.isDefault ?? (!existing && (await this.listByRestaurant(input.restaurantId)).length === 0);

    if (shouldDefault) {
      await db
        .update(restaurantPrinters)
        .set({ isDefault: false })
        .where(eq(restaurantPrinters.restaurantId, input.restaurantId));
    }

    await db
      .insert(restaurantPrinters)
      .values({
        restaurantId: input.restaurantId,
        printerId: input.printerId,
        displayName: input.displayName,
        platform: input.platform,
        transport: input.transport,
        isDefault: shouldDefault,
        isActive: true,
        capabilitiesJson: input.capabilities ?? null,
        lastValidatedAt: input.lastValidatedAt ?? null,
      })
      .onDuplicateKeyUpdate({
        set: {
          displayName: input.displayName,
          platform: input.platform,
          transport: input.transport,
          isActive: true,
          capabilitiesJson: input.capabilities ?? null,
          lastValidatedAt: input.lastValidatedAt ?? null,
          ...(shouldDefault ? { isDefault: true } : {}),
        },
      });

    const saved = await this.findByPrinterId(input.restaurantId, input.printerId);
    if (!saved) throw new Error("Failed to save restaurant printer");
    return saved;
  }

  async rename(
    restaurantId: number,
    printerId: string,
    displayName: string
  ): Promise<RestaurantPrinterDto | null> {
    const db = await getDb();
    if (!db) return null;

    await db
      .update(restaurantPrinters)
      .set({ displayName })
      .where(
        and(eq(restaurantPrinters.restaurantId, restaurantId), eq(restaurantPrinters.printerId, printerId))
      );

    return this.findByPrinterId(restaurantId, printerId);
  }

  async remove(restaurantId: number, printerId: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const target = await this.findByPrinterId(restaurantId, printerId);
    if (!target) return false;

    await db
      .update(restaurantPrinters)
      .set({ isActive: false, isDefault: false })
      .where(
        and(eq(restaurantPrinters.restaurantId, restaurantId), eq(restaurantPrinters.printerId, printerId))
      );

    if (target.isDefault) {
      const [next] = await this.listByRestaurant(restaurantId);
      if (next) await this.setDefault(restaurantId, next.printerId);
    }

    return true;
  }

  async setDefault(restaurantId: number, printerId: string): Promise<RestaurantPrinterDto | null> {
    const db = await getDb();
    if (!db) return null;

    await db
      .update(restaurantPrinters)
      .set({ isDefault: false })
      .where(eq(restaurantPrinters.restaurantId, restaurantId));

    await db
      .update(restaurantPrinters)
      .set({ isDefault: true })
      .where(
        and(eq(restaurantPrinters.restaurantId, restaurantId), eq(restaurantPrinters.printerId, printerId))
      );

    return this.findByPrinterId(restaurantId, printerId);
  }

  async markValidated(restaurantId: number, printerId: string, validatedAt: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
      .update(restaurantPrinters)
      .set({ lastValidatedAt: validatedAt })
      .where(
        and(eq(restaurantPrinters.restaurantId, restaurantId), eq(restaurantPrinters.printerId, printerId))
      );
  }
}
