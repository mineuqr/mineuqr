/**
 * THERMAL-PRINTING-9B — read-only execution strategy query helpers.
 */
import type { ExecutionMethod, ExecutionPlatform } from "../../shared/printing/executionCapabilities";
import type {
  ExecutionStrategyPrinterCharacteristics,
  ExecutionStrategyResult,
} from "../../shared/printing/executionStrategy";
import { getSupportedExecutionMethods } from "./executionCapabilityQueries";
import { resolveExecutionStrategy } from "./executionStrategyResolver";

export type GetAvailableExecutionStrategiesInput = {
  platform: ExecutionPlatform;
  printer: ExecutionStrategyPrinterCharacteristics;
};

export function getAvailableExecutionStrategies(
  input: GetAvailableExecutionStrategiesInput
): ExecutionMethod[] {
  return getSupportedExecutionMethods(input.platform).filter((method) =>
    supportsExecutionStrategy({
      platform: input.platform,
      method,
      printer: input.printer,
    })
  );
}

export function supportsExecutionStrategy(input: {
  platform: ExecutionPlatform;
  method: ExecutionMethod;
  printer: ExecutionStrategyPrinterCharacteristics;
}): boolean {
  const result = resolveExecutionStrategy({
    platform: input.platform,
    printer: input.printer,
  });

  return result.resolved && result.method === input.method;
}

export function inspectExecutionStrategy(
  input: GetAvailableExecutionStrategiesInput
): ExecutionStrategyResult {
  return resolveExecutionStrategy(input);
}
