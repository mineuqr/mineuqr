/**
 * DATA-RETENTION-PLATFORM-1 — retention policy validation.
 */

import { RETENTION_ENTITY_TYPES } from "../constants";
import type { RetentionEntityType, RetentionPolicy } from "../types";

export type RetentionPolicyValidationIssue = Readonly<{
  field: string;
  message: string;
}>;

export type RetentionPolicyValidationResult = Readonly<{
  ok: boolean;
  issues: readonly RetentionPolicyValidationIssue[];
}>;

function isEntityType(value: string): value is RetentionEntityType {
  return (RETENTION_ENTITY_TYPES as readonly string[]).includes(value);
}

function isNonNegativeInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

function isIsoDate(value: unknown): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function validateRetentionPolicy(
  input: unknown
): RetentionPolicyValidationResult {
  const issues: RetentionPolicyValidationIssue[] = [];
  if (input == null || typeof input !== "object") {
    return { ok: false, issues: [{ field: "$", message: "Policy must be an object" }] };
  }
  const p = input as Partial<RetentionPolicy>;

  if (typeof p.policyId !== "string" || p.policyId.trim() === "") {
    issues.push({ field: "policyId", message: "policyId is required" });
  }
  if (typeof p.entityType !== "string" || !isEntityType(p.entityType)) {
    issues.push({ field: "entityType", message: "entityType is invalid" });
  }
  if (typeof p.enabled !== "boolean") {
    issues.push({ field: "enabled", message: "enabled must be boolean" });
  }
  if (!isNonNegativeInt(p.displayWindowDays)) {
    issues.push({
      field: "displayWindowDays",
      message: "displayWindowDays must be a non-negative integer",
    });
  }
  if (!isNonNegativeInt(p.operationalRetentionDays)) {
    issues.push({
      field: "operationalRetentionDays",
      message: "operationalRetentionDays must be a non-negative integer",
    });
  }
  if (!isNonNegativeInt(p.archiveRetentionDays)) {
    issues.push({
      field: "archiveRetentionDays",
      message: "archiveRetentionDays must be a non-negative integer",
    });
  }
  if (
    isNonNegativeInt(p.displayWindowDays) &&
    isNonNegativeInt(p.operationalRetentionDays) &&
    p.displayWindowDays > p.operationalRetentionDays
  ) {
    issues.push({
      field: "displayWindowDays",
      message: "displayWindowDays must be <= operationalRetentionDays",
    });
  }
  for (const field of [
    "archiveEnabled",
    "restoreEnabled",
    "purgeEnabled",
    "legalHoldSupported",
    "defaultPolicy",
    "restaurantOverrideAllowed",
  ] as const) {
    if (typeof p[field] !== "boolean") {
      issues.push({ field, message: `${field} must be boolean` });
    }
  }
  if (!isNonNegativeInt(p.version) || (p.version as number) < 1) {
    issues.push({ field: "version", message: "version must be integer >= 1" });
  }
  if (!isIsoDate(p.createdAt)) {
    issues.push({ field: "createdAt", message: "createdAt must be ISO datetime" });
  }
  if (!isIsoDate(p.updatedAt)) {
    issues.push({ field: "updatedAt", message: "updatedAt must be ISO datetime" });
  }
  if (
    p.restaurantId != null &&
    (typeof p.restaurantId !== "number" ||
      !Number.isInteger(p.restaurantId) ||
      p.restaurantId <= 0)
  ) {
    issues.push({
      field: "restaurantId",
      message: "restaurantId must be a positive integer when set",
    });
  }
  if (p.purgeEnabled === true && p.archiveEnabled !== true) {
    issues.push({
      field: "purgeEnabled",
      message: "purgeEnabled requires archiveEnabled (no hot-only purge by default)",
    });
  }
  if (p.entityType === "settlement_record" && p.purgeEnabled === true) {
    issues.push({
      field: "purgeEnabled",
      message: "settlement_record purge is forbidden (DR-12)",
    });
  }

  return { ok: issues.length === 0, issues };
}

export function assertValidRetentionPolicy(
  input: unknown
): asserts input is RetentionPolicy {
  const result = validateRetentionPolicy(input);
  if (!result.ok) {
    throw new Error(
      `Invalid RetentionPolicy: ${result.issues
        .map((i) => `${i.field}: ${i.message}`)
        .join("; ")}`
    );
  }
}
