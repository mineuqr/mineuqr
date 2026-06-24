/**
 * THERMAL-PRINTING-11A — printer and print-settings persistence queries.
 */
import { and, eq } from "drizzle-orm";
import { printers, restaurantPrintSettings, type SelectPrinter } from "../../drizzle/schema";
import { getDb } from "../db";
import { PrintJobUnavailableError } from "./printJobTypes";

async function resolveDb() {
  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }
  return db;
}

export async function listPrintersForRestaurant(
  restaurantId: number
): Promise<SelectPrinter[]> {
  const db = await resolveDb();
  return db
    .select()
    .from(printers)
    .where(eq(printers.restaurantId, restaurantId))
    .orderBy(printers.id);
}

export async function findPrinterById(printerId: number): Promise<SelectPrinter | null> {
  const db = await resolveDb();
  const [row] = await db.select().from(printers).where(eq(printers.id, printerId)).limit(1);
  return row ?? null;
}

export async function findRestaurantPrintSettings(restaurantId: number) {
  const db = await resolveDb();
  const [row] = await db
    .select()
    .from(restaurantPrintSettings)
    .where(eq(restaurantPrintSettings.restaurantId, restaurantId))
    .limit(1);
  return row ?? null;
}

export async function listAllPrinters(): Promise<SelectPrinter[]> {
  const db = await resolveDb();
  return db.select().from(printers).orderBy(printers.id);
}

export async function clearDefaultPrinterForRestaurant(restaurantId: number): Promise<void> {
  const db = await resolveDb();
  await db
    .update(printers)
    .set({ isDefault: false })
    .where(and(eq(printers.restaurantId, restaurantId), eq(printers.isDefault, true)));
}

export async function insertPrinterForRestaurant(input: {
  restaurantId: number;
  name: string;
  paperWidthMm: number;
  profileId: string;
  isDefault: boolean;
}): Promise<SelectPrinter> {
  const db = await resolveDb();

  if (input.isDefault) {
    await clearDefaultPrinterForRestaurant(input.restaurantId);
  }

  const [result] = await db.insert(printers).values({
    restaurantId: input.restaurantId,
    name: input.name.trim(),
    paperWidthMm: input.paperWidthMm,
    profileId: input.profileId,
    isDefault: input.isDefault,
  });

  const id = Number(result.insertId);
  const row = await findPrinterById(id);
  if (!row) {
    throw new PrintJobUnavailableError();
  }
  return row;
}
