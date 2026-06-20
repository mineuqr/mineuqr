/**
 * THERMAL-PRINTING-3C.3 — placeholder print processor (no physical I/O).
 * Future milestones swap this module for ESC/POS, browser, or network adapters.
 */
import { getOrderById } from "../db";
import type { SelectPrintJob } from "../../drizzle/schema";
import { findPrintJobById } from "./printJobRepository";

export type ExecutePrintJobResult = {
  success: boolean;
  error?: string;
};

export async function executePrintJob(job: SelectPrintJob): Promise<ExecutePrintJobResult> {
  const currentJob = await findPrintJobById(job.id);
  if (!currentJob) {
    return { success: false, error: "Print job not found" };
  }

  const order = await getOrderById(currentJob.orderId);
  if (!order) {
    return { success: false, error: "Order not found" };
  }

  if (order.restaurantId !== currentJob.restaurantId) {
    return { success: false, error: "Order restaurant mismatch" };
  }

  return { success: true };
}
