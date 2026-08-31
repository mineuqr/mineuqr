/**
 * SAUDI-TAX-INVOICE-PHASE-1
 * Restaurant-scoped Tax Invoice number allocator (Compliance plane).
 */

import { eq, sql } from "drizzle-orm";
import { saudiTaxInvoiceSequences } from "../../../drizzle/schema";
import { getDb } from "../../db";
import { formatSaudiTaxInvoiceNumber } from "@shared/compliance";

export async function allocateSaudiTaxInvoiceNumber(
  restaurantId: number
): Promise<{ sequenceNumber: number; invoiceNumber: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(saudiTaxInvoiceSequences)
    .values({ restaurantId, lastNumber: 0 })
    .onDuplicateKeyUpdate({ set: { lastNumber: sql`${saudiTaxInvoiceSequences.lastNumber}` } });

  await db
    .update(saudiTaxInvoiceSequences)
    .set({ lastNumber: sql`${saudiTaxInvoiceSequences.lastNumber} + 1` })
    .where(eq(saudiTaxInvoiceSequences.restaurantId, restaurantId));

  const [row] = await db
    .select()
    .from(saudiTaxInvoiceSequences)
    .where(eq(saudiTaxInvoiceSequences.restaurantId, restaurantId))
    .limit(1);
  if (!row) throw new Error("Tax Invoice sequence allocate failed");
  return {
    sequenceNumber: row.lastNumber,
    invoiceNumber: formatSaudiTaxInvoiceNumber(row.lastNumber),
  };
}
