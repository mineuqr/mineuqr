import type { TransportType } from "./TransportType";

export type PrinterCapability = {
  printerId: string;
  transport: TransportType;
  supportsRawText: boolean;
  supportsCut: boolean;
  paperWidthMm?: number | null;
  maxCharsPerLine?: number | null;
  dpi?: number | null;
};
