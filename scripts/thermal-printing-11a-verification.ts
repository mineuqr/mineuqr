/**
 * THERMAL-PRINTING-11A — verify automatic printer target selection against live DB.
 */
import "dotenv/config";
import { desc, eq } from "drizzle-orm";
import { orders, printJobs } from "../drizzle/schema";
import { getDb } from "../server/db";
import { createPrintJob } from "../server/printing/printJobService";
import { resolvePrintTarget } from "../server/printing/printTargetSelectionService";

async function findOrderWithoutAutoPrintJob(): Promise<{
  id: number;
  restaurantId: number;
  orderNumber: string | null;
  status: string;
  createdAt: string;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const recentOrders = await db
    .select({
      id: orders.id,
      restaurantId: orders.restaurantId,
      orderNumber: orders.orderNumber,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.id))
    .limit(20);

  for (const candidate of recentOrders) {
    const [existingAutoJob] = await db
      .select({ id: printJobs.id })
      .from(printJobs)
      .where(eq(printJobs.idempotencyKey, `order:${candidate.id}:submitted`))
      .limit(1);
    if (!existingAutoJob) {
      return candidate;
    }
  }

  throw new Error("No recent order without an auto print job was found");
}

async function main() {
  const verificationOrder = await findOrderWithoutAutoPrintJob();

  const target = await resolvePrintTarget({
    restaurantId: verificationOrder.restaurantId,
  });

  const created = await createPrintJob({
    orderId: verificationOrder.id,
    trigger: "auto",
    printerId: target.dbPrinterId,
  });

  console.log("=== THERMAL-PRINTING-11A VERIFICATION ===");
  console.log(
    JSON.stringify(
      {
        order: {
          orderId: verificationOrder.id,
          orderNumber: verificationOrder.orderNumber,
          restaurantId: verificationOrder.restaurantId,
          status: verificationOrder.status,
          createdAt: verificationOrder.createdAt,
        },
        selectedTarget: target,
        printJob: {
          jobId: created.job.id,
          created: created.created,
          printerId: created.job.printerId,
          status: created.job.status,
          idempotencyKey: created.job.idempotencyKey,
        },
      },
      null,
      2
    )
  );

  const passed =
    created.job.printerId === target.dbPrinterId && created.job.printerId != null;

  console.log("\n=== VERDICT ===");
  console.log(passed ? "THERMAL-PRINTING-11A VERIFICATION PASSED" : "THERMAL-PRINTING-11A VERIFICATION FAILED");

  if (!passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[thermal-printing-11a] fatal:", error);
  process.exit(1);
});
