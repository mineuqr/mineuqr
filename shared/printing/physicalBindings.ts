/**
 * THERMAL-PRINTING-13I.2E.1 — physical printer binding model (PRINTING-ARCHITECTURE-NOTE-6).
 *
 * Logical printer identity lives in startupPrinters / dashboard.
 * Physical Windows spooler binding is owned by agent/installer.
 */
export const PHYSICAL_BINDING_STATUSES = ["pending", "bound"] as const;

export type PhysicalBindingStatus = (typeof PHYSICAL_BINDING_STATUSES)[number];

export const PHYSICAL_BINDING_TRANSPORT_KINDS = ["windows-spooler"] as const;

export type PhysicalBindingTransportKind =
  (typeof PHYSICAL_BINDING_TRANSPORT_KINDS)[number];

export type PhysicalBindingPlaceholder = {
  bindingStatus: "pending";
  logicalPrinterId: string;
  logicalPrinterName: string;
  transportKind: PhysicalBindingTransportKind;
  dbPrinterId?: number;
};

export type PhysicalBindingBound = {
  bindingStatus: "bound";
  logicalPrinterId: string;
  logicalPrinterName: string;
  transportKind: PhysicalBindingTransportKind;
  windowsSpoolerQueueName: string;
  portName?: string;
  dbPrinterId?: number;
};

export type PhysicalBindingEntry = PhysicalBindingPlaceholder | PhysicalBindingBound;

export function isPendingPhysicalBinding(
  entry: PhysicalBindingEntry | undefined
): entry is PhysicalBindingPlaceholder {
  return entry?.bindingStatus === "pending";
}

export function isBoundPhysicalBinding(
  entry: PhysicalBindingEntry | undefined
): entry is PhysicalBindingBound {
  return entry?.bindingStatus === "bound";
}
