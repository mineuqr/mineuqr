/**
 * THERMAL-PRINTING-11A — printer and print-settings persistence queries.
 */
import { eq } from "drizzle-orm";
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
