/**
 * THERMAL-PRINTING-13I.1J — printer provisioning types.
 */

export type ProvisioningStep = "add_printer" | "connect_agent" | "test_print" | "blocked";

export type PrinterProvisioningState = {
  step: ProvisioningStep;
  suggestedAgentId: string;
  primaryPrinterId: number | null;
  primaryPrinterName: string | null;
  connectConfig: Record<string, unknown> | null;
};

export type CreatedPrinterView = {
  id: number;
  name: string;
  paperWidthMm: number;
  isDefault: boolean;
};
