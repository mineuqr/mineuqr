/**
 * THERMAL-PRINTING-10B — server transport delivery context builder.
 */
import type { ExecutionContext } from "../../shared/printing/executionContext";
import type { TransportDeliveryContext } from "../../shared/printing/transports/transportDeliveryContext";
import { getPrinterProfile } from "./printerProfileQueries";
import { getPrinterResolution } from "./resolutionQueries";

export function buildTransportDeliveryContext(input: {
  agentId: string;
  dbPrinterId: number;
  executionContext?: ExecutionContext;
}): TransportDeliveryContext | undefined {
  if (!input.executionContext) {
    return undefined;
  }

  const resolution = getPrinterResolution(input.dbPrinterId);
  if (!resolution) {
    return undefined;
  }

  const printerProfile = getPrinterProfile(input.agentId, resolution.profilePrinterId);
  if (!printerProfile) {
    return undefined;
  }

  return {
    executionContext: input.executionContext,
    printerProfile,
  };
}
