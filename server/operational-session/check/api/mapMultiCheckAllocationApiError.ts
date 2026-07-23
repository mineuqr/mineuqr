/**
 * MULTI-CHECK-ALLOCATION-API-1 — canonical API error mapping.
 * Never expose Domain / Repository / Database internals or stack traces.
 */

import { TRPCError } from "@trpc/server";
import { MultiCheckAllocationDomainError } from "@shared/operational-session";
import { MultiCheckAllocationPersistenceError } from "../multiCheckAllocationRepository";

export class MultiCheckAllocationProjectionUnavailableError extends Error {
  constructor(message = "Multi Check Allocation projection unavailable") {
    super(message);
    this.name = "MultiCheckAllocationProjectionUnavailableError";
  }
}

function isNotFoundMessage(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("not found") || m.includes("does not exist");
}

function isForbiddenMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("ownership") ||
    m.includes("tenant") ||
    m.includes("for restaurant") ||
    m.includes("commanding check")
  );
}

export function throwMultiCheckAllocationApiError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof MultiCheckAllocationProjectionUnavailableError) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Multi Check Allocation projection unavailable",
    });
  }

  if (error instanceof MultiCheckAllocationPersistenceError) {
    if (error.code === "NOT_FOUND") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Multi Check Allocation not found",
      });
    }
    if (error.code === "CONFLICT" || error.code === "DUPLICATE") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Multi Check Allocation conflict",
      });
    }
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Multi Check Allocation unavailable",
    });
  }

  if (error instanceof MultiCheckAllocationDomainError) {
    if (
      error.code === "ALLOCATION_ALREADY_COMPLETED" ||
      error.code === "ALLOCATION_ALREADY_CANCELLED" ||
      error.code === "ALLOCATION_ALREADY_REVERSED" ||
      error.code === "ILLEGAL_TERMINAL_TRANSITION" ||
      error.code === "INVALID_ALLOCATION_TRANSITION" ||
      error.code === "INVALID_ALLOCATION_STATE" ||
      error.code === "FINALITY_VIOLATION"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Multi Check Allocation command rejected",
      });
    }
    if (
      error.code === "IDENTITY_VIOLATION" ||
      error.code === "DUPLICATE_IDENTITY" ||
      error.code === "ORDER_SETTLEMENT_OWNERSHIP_VIOLATION"
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Multi Check Allocation ownership violation",
      });
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid Multi Check Allocation command",
    });
  }

  if (error instanceof Error) {
    if (isNotFoundMessage(error.message)) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Multi Check Allocation not found",
      });
    }
    if (isForbiddenMessage(error.message)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Multi Check Allocation access denied",
      });
    }
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unable to process Multi Check Allocation",
  });
}

export function runMultiCheckAllocationRead<T>(
  fn: () => Promise<T>
): Promise<T> {
  return fn().catch((error: unknown) =>
    throwMultiCheckAllocationApiError(error)
  );
}

export function runMultiCheckAllocationWrite<T>(
  fn: () => Promise<T>
): Promise<T> {
  return fn().catch((error: unknown) =>
    throwMultiCheckAllocationApiError(error)
  );
}
