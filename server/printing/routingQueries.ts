/**
 * THERMAL-PRINTING-8A.5 — read-only routing queries.
 */
import { getPrinterOwner as lookupPrinterOwner } from "./printerOwnershipService";
import { getRoutingDecision as lookupRoutingDecision } from "./routingEngine";
import type { RoutingDecision } from "./routingTypes";

export function getPrinterOwner(printerId: string): string | undefined {
  return lookupPrinterOwner(printerId);
}

export function getRoutingDecision(jobId: number): RoutingDecision | undefined {
  return lookupRoutingDecision(jobId);
}
