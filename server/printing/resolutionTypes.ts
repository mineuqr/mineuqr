/**
 * THERMAL-PRINTING-8B.1 — printer resolution model (TRANSPORT-ROUTING-NOTE-1).
 *
 * Resolution ≠ Routing ≠ Capability Matching
 */

export type PrinterResolution = {
  dbPrinterId: number;
  profilePrinterId: string;
  agentId: string;
};

export const RESOLUTION_FAILURE_CODES = {
  UNKNOWN_DB_PRINTER: "unknown-db-printer",
  UNKNOWN_PROFILE: "unknown-profile",
  RESOLUTION_CONFLICT: "resolution-conflict",
  INVALID_INPUT: "invalid-input",
} as const;

export type ResolutionFailureCode =
  (typeof RESOLUTION_FAILURE_CODES)[keyof typeof RESOLUTION_FAILURE_CODES];

export class ResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolutionError";
  }
}

export class ResolutionRejectedError extends ResolutionError {
  constructor(
    public readonly code: ResolutionFailureCode,
    message: string
  ) {
    super(message);
    this.name = "ResolutionRejectedError";
  }
}

export type DbPrinterProfileMapping = {
  dbPrinterId: number;
  profilePrinterId: string;
};

export type RegisterDbPrinterProfileMappingInput = DbPrinterProfileMapping;
