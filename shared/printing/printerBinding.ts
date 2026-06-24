/**
 * THERMAL-PRINTING-13I.2E.2 — Windows printer discovery and local binding store.
 */
export const PRINTER_BINDINGS_FILE_VERSION = "13I.2E.2" as const;

export type PrinterDiscoveryResult = {
  printerName: string;
  portName: string;
};

export const RUNTIME_BINDING_STATUSES = [
  "BOUND",
  "UNBOUND",
  "MISSING_PRINTER",
  "INVALID_BINDING",
] as const;

export type RuntimeBindingStatus = (typeof RUNTIME_BINDING_STATUSES)[number];

export type StoredPrinterBinding = {
  profileId: string;
  logicalPrinterName: string;
  windowsPrinterName: string;
  portName?: string;
  bindingStatus: "bound";
};

export type PrinterBindingsFile = {
  version: typeof PRINTER_BINDINGS_FILE_VERSION;
  bindings: StoredPrinterBinding[];
  updatedAt: string;
};

export type BindingDiagnosticItem = {
  profileId: string;
  logicalPrinterName: string;
  windowsPrinterName: string | null;
  portName: string | null;
  status: RuntimeBindingStatus;
  message?: string;
};

export type BindingDiagnosticsReport = {
  generatedAt: string;
  configPath: string;
  bindingsPath: string;
  items: BindingDiagnosticItem[];
};
