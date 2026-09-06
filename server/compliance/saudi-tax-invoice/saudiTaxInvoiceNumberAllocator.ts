/**
 * CASHIER-TAX-INVOICE-PREPARING-STATE-LATENCY-1
 * Atomic restaurant-scoped Tax Invoice number allocation.
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

  const sequenceNumber = await db.transaction(async (tx) => {
    await tx
      .insert(saudiTaxInvoiceSequences)
      .values({ restaurantId, lastNumber: 0 })
      .onDuplicateKeyUpdate({
        set: { lastNumber: sql`${saudiTaxInvoiceSequences.lastNumber}` },
      });

    await tx.execute(
      sql`SELECT \`lastNumber\` FROM \`saudi_tax_invoice_sequences\` WHERE \`restaurantId\` = ${restaurantId} FOR UPDATE`
    );

    await tx
      .update(saudiTaxInvoiceSequences)
      .set({ lastNumber: sql`${saudiTaxInvoiceSequences.lastNumber} + 1` })
      .where(eq(saudiTaxInvoiceSequences.restaurantId, restaurantId));

    const [row] = await tx
      .select()
      .from(saudiTaxInvoiceSequences)
      .where(eq(saudiTaxInvoiceSequences.restaurantId, restaurantId))
      .limit(1);
    if (!row) throw new Error("Tax Invoice sequence allocate failed");
    return row.lastNumber;
  });

  return {
    sequenceNumber,
    invoiceNumber: formatSaudiTaxInvoiceNumber(sequenceNumber),
  };
}
