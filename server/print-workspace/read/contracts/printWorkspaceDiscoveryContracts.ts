import type { PrinterInfo } from "../../../print-connector/domain/PrinterInfo";

export type WorkspaceDiscoverPrintersResultDto = {
  printers: PrinterInfo[];
  discoveredAt: string;
  unavailable: boolean;
  message: string | null;
};
