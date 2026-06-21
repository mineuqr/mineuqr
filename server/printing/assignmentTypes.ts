/**
 * THERMAL-PRINTING-7A.1 — print job assignment domain types.
 */

export interface PrintJobAssignment {
  jobId: number;
  agentId: string;
  restaurantId: number;
  orderId: number;
  printerId: number;
  assignedAt: string;
}

export class PrintJobAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintJobAssignmentError";
  }
}

export class NoEligibleAgentError extends PrintJobAssignmentError {
  constructor(message = "No eligible print agent available") {
    super(message);
    this.name = "NoEligibleAgentError";
  }
}

export type AssignPrintJobInput = {
  jobId: number;
  assignedAt?: string;
  evaluationNow?: Date;
};

export type AssignPrintJobResult = {
  assignment: PrintJobAssignment;
  created: boolean;
};
