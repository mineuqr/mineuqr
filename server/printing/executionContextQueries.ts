/**
 * THERMAL-PRINTING-9C — read-only execution context query helpers.
 */
import type { ExecutionMethod, ExecutionTransport } from "../../shared/printing/executionCapabilities";
import type { ExecutionContext } from "../../shared/printing/executionContext";
import { executionContextToStrategyInput } from "../../shared/printing/executionContext";
import type { ExecutionStrategyResult } from "../../shared/printing/executionStrategy";
import { resolveExecutionStrategy } from "./executionStrategyResolver";

export function getExecutionContextCapabilities(
  context: ExecutionContext
): ExecutionContext["capabilities"] {
  return context.capabilities;
}

export function getExecutionContextAvailability(
  context: ExecutionContext
): ExecutionContext["availability"] {
  return context.availability;
}

export function supportsExecutionMethod(
  context: ExecutionContext,
  method: ExecutionMethod
): boolean {
  return context.capabilities.supportedMethods.includes(method);
}

export function supportsExecutionTransport(
  context: ExecutionContext,
  transport: ExecutionTransport
): boolean {
  return context.capabilities.supportedTransports.includes(transport);
}

export function isExecutionTransportAvailable(
  context: ExecutionContext,
  transport: ExecutionTransport
): boolean {
  return context.availability.availableTransports.includes(transport);
}

export function resolveExecutionStrategyFromContext(
  context: ExecutionContext
): ExecutionStrategyResult {
  return resolveExecutionStrategy(executionContextToStrategyInput(context));
}
