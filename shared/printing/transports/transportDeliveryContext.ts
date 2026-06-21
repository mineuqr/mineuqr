/**
 * THERMAL-PRINTING-10B — transport delivery context passed to agent runtime.
 */
import type { ExecutionContext } from "../executionContext";
import type { PrinterProfile } from "../printerProfiles";

export type TransportDeliveryContext = {
  executionContext: ExecutionContext;
  printerProfile: PrinterProfile;
};
