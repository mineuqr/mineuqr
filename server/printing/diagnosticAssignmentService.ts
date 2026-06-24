/**
 * THERMAL-PRINTING-13I.6 — in-memory diagnostic print assignments (Print Host runtime).
 */
import type { AgentJobTicketPayload } from "../../shared/printing/agentJobMessages";

export type DiagnosticPrintAssignment = {
  wireJobId: number;
  diagnosticId: string;
  diagnosticRunId: number;
  agentId: string;
  restaurantId: number;
  printerId: number;
  ticket: AgentJobTicketPayload;
  assignedAt: string;
};

const assignments = new Map<number, DiagnosticPrintAssignment>();
const notifiedWireJobIds = new Set<number>();

export function getDiagnosticPrintAssignment(
  wireJobId: number
): DiagnosticPrintAssignment | undefined {
  return assignments.get(wireJobId);
}

export function assignDiagnosticPrintJob(
  assignment: DiagnosticPrintAssignment
): { created: boolean; assignment: DiagnosticPrintAssignment } {
  const existing = assignments.get(assignment.wireJobId);
  if (existing) {
    return { created: false, assignment: existing };
  }
  assignments.set(assignment.wireJobId, assignment);
  return { created: true, assignment };
}

export function hasDiagnosticNotificationBeenSent(wireJobId: number): boolean {
  return notifiedWireJobIds.has(wireJobId);
}

export function recordDiagnosticNotificationSent(wireJobId: number): void {
  notifiedWireJobIds.add(wireJobId);
}

export function clearDiagnosticPrintAssignments(): void {
  assignments.clear();
  notifiedWireJobIds.clear();
}
