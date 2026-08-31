/**
 * CUSTOMER-FOUNDATION-1 — global Customer validation (country-agnostic).
 */

import {
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  type CustomerCreateInput,
  type CustomerStatus,
  type CustomerType,
  type CustomerUpdateInput,
} from "./customerContract";

export type CustomerValidationIssue = Readonly<{
  field: string;
  code: string;
  message: string;
}>;

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}

export function parseCustomerType(value: string): CustomerType | null {
  return (CUSTOMER_TYPES as readonly string[]).includes(value)
    ? (value as CustomerType)
    : null;
}

export function parseCustomerStatus(value: string): CustomerStatus | null {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value)
    ? (value as CustomerStatus)
    : null;
}

export function validateCustomerCreate(
  input: CustomerCreateInput
): CustomerValidationIssue[] {
  const issues: CustomerValidationIssue[] = [];
  const name = input.displayName.trim();
  if (name.length === 0) {
    issues.push({
      field: "displayName",
      code: "required",
      message: "Display name is required",
    });
  } else if (name.length > 255) {
    issues.push({
      field: "displayName",
      code: "too_long",
      message: "Display name must be at most 255 characters",
    });
  }
  if (!parseCustomerType(input.customerType)) {
    issues.push({
      field: "customerType",
      code: "invalid",
      message: "Customer type must be individual or business",
    });
  }
  const email = trimOrNull(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push({
      field: "email",
      code: "invalid",
      message: "Email format is invalid",
    });
  }
  const phone = trimOrNull(input.phone);
  if (phone && phone.length > 32) {
    issues.push({
      field: "phone",
      code: "too_long",
      message: "Phone must be at most 32 characters",
    });
  }
  // taxNumber is optional for all types — no country branching.
  return issues;
}

export function validateCustomerUpdate(
  input: CustomerUpdateInput
): CustomerValidationIssue[] {
  const issues: CustomerValidationIssue[] = [];
  if (input.displayName !== undefined) {
    const name = input.displayName.trim();
    if (name.length === 0) {
      issues.push({
        field: "displayName",
        code: "required",
        message: "Display name is required",
      });
    } else if (name.length > 255) {
      issues.push({
        field: "displayName",
        code: "too_long",
        message: "Display name must be at most 255 characters",
      });
    }
  }
  if (
    input.customerType !== undefined &&
    !parseCustomerType(input.customerType)
  ) {
    issues.push({
      field: "customerType",
      code: "invalid",
      message: "Customer type must be individual or business",
    });
  }
  if (input.status !== undefined && !parseCustomerStatus(input.status)) {
    issues.push({
      field: "status",
      code: "invalid",
      message: "Status must be active or archived",
    });
  }
  if (input.email !== undefined) {
    const email = trimOrNull(input.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push({
        field: "email",
        code: "invalid",
        message: "Email format is invalid",
      });
    }
  }
  return issues;
}

export function normalizeOptionalText(
  value: string | null | undefined
): string | null {
  return trimOrNull(value);
}
