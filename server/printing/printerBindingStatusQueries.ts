/**
 * THERMAL-PRINTING-13I.3A — read-only printer binding status queries.
 */
import type { RuntimeBindingStatus } from "../../shared/printing/printerBinding";
import type { AgentPrinterBindingReportItem } from "../../shared/printing/printerBindingReport";
import {
  getStoredAgentPrinterBindingStatus,
  getStoredPrinterBindingStatus,
  type AgentPrinterBindingStatusRecord,
} from "./printerBindingStatusStore";

export function getAgentPrinterBindingStatus(
  agentId: string
): AgentPrinterBindingStatusRecord | undefined {
  return getStoredAgentPrinterBindingStatus(agentId);
}

export function getPrinterBindingStatus(
  agentId: string,
  profileId: string
): AgentPrinterBindingReportItem | undefined {
  return getStoredPrinterBindingStatus(agentId, profileId);
}

export type RestaurantPrinterBindingStatusItem = {
  printerId: number;
  profileId: string;
  logicalPrinterName: string;
  agentId: string | null;
  bindingStatus: RuntimeBindingStatus | "UNKNOWN";
  windowsPrinterName: string | null;
  portName: string | null;
  lastValidatedAt: string | null;
  message: string | null;
};

export function buildUnknownBindingStatusItem(input: {
  printerId: number;
  profileId: string;
  logicalPrinterName: string;
  agentId: string | null;
  message?: string;
}): RestaurantPrinterBindingStatusItem {
  return {
    printerId: input.printerId,
    profileId: input.profileId,
    logicalPrinterName: input.logicalPrinterName,
    agentId: input.agentId,
    bindingStatus: "UNKNOWN",
    windowsPrinterName: null,
    portName: null,
    lastValidatedAt: null,
    message: input.message ?? "No binding status reported yet",
  };
}

export function buildBindingStatusItemFromReport(input: {
  printerId: number;
  logicalPrinterName: string;
  agentId: string;
  reportItem: AgentPrinterBindingReportItem;
}): RestaurantPrinterBindingStatusItem {
  return {
    printerId: input.printerId,
    profileId: input.reportItem.profileId,
    logicalPrinterName: input.logicalPrinterName,
    agentId: input.agentId,
    bindingStatus: input.reportItem.bindingStatus,
    windowsPrinterName: input.reportItem.windowsPrinterName,
    portName: input.reportItem.portName,
    lastValidatedAt: input.reportItem.lastValidatedAt,
    message: input.reportItem.message ?? null,
  };
}
