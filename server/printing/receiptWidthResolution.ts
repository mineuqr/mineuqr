/**
 * THERMAL-PRINTING-13C — server-side printer width resolution from profile store.
 */
import type { PaperWidthMm } from "../../shared/printing/types";
import { resolvePaperWidthFromPrinterProfile } from "../../shared/printing/receipts/receiptWidthResolution";
import { getPrinterProfile } from "./printerProfileQueries";

export function resolvePaperWidthForAgentProfile(input: {
  agentId: string;
  profilePrinterId: string;
}): PaperWidthMm | undefined {
  return resolvePaperWidthFromPrinterProfile(
    getPrinterProfile(input.agentId, input.profilePrinterId)
  );
}
