/**
 * THERMAL-PRINTING-13I.3B — configuration revision fingerprint and invalidation.
 */
import { createHash } from "node:crypto";
import type { SelectPrintDiagnosticRun } from "../../../drizzle/schema";
import type { DiagnosticPrintStatus } from "../../../shared/printing/diagnosticPrint";
import type {
  PrintingConfigurationRevision,
  PrintingConfigurationRevisionFactor,
} from "./types";

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
}

export function computeConfigurationRevision(
  factors: PrintingConfigurationRevisionFactor[]
): PrintingConfigurationRevision {
  const sortedFactors = [...factors].sort((left, right) => left.printerId - right.printerId);
  const revision = createHash("sha256").update(stableSerialize(sortedFactors)).digest("hex");

  const invalidationEpoch = sortedFactors.reduce((latest, factor) => {
    const candidates = [factor.printerUpdatedAt, factor.bindingValidatedAt].filter(
      (value): value is string => typeof value === "string" && value.length > 0
    );
    for (const candidate of candidates) {
      if (candidate > latest) {
        latest = candidate;
      }
    }
    return latest;
  }, "1970-01-01T00:00:00.000Z");

  return {
    revision,
    invalidationEpoch,
    factors: sortedFactors,
  };
}

export function isDiagnosticValidForConfiguration(input: {
  diagnostic: SelectPrintDiagnosticRun | null;
  primaryPrinterId: number | null;
  configurationRevision: PrintingConfigurationRevision;
  currentAssignedAgentId: string | null;
}): boolean {
  const { diagnostic } = input;
  if (!diagnostic || diagnostic.status !== "completed") {
    return false;
  }
  if (input.primaryPrinterId == null || diagnostic.printerId !== input.primaryPrinterId) {
    return false;
  }
  if (!diagnostic.completedAt) {
    return false;
  }

  if (
    input.currentAssignedAgentId &&
    diagnostic.agentId &&
    diagnostic.agentId !== input.currentAssignedAgentId
  ) {
    return false;
  }

  return diagnostic.completedAt >= input.configurationRevision.invalidationEpoch;
}

export function findLatestCompletedDiagnosticForPrinter(input: {
  diagnostics: SelectPrintDiagnosticRun[];
  printerId: number;
}): SelectPrintDiagnosticRun | null {
  return (
    input.diagnostics.find(
      (row) => row.printerId === input.printerId && row.status === "completed"
    ) ?? null
  );
}

export function mapDiagnosticStatus(status: string): DiagnosticPrintStatus | null {
  if (
    status === "pending" ||
    status === "accepted" ||
    status === "completed" ||
    status === "failed"
  ) {
    return status;
  }
  return null;
}
