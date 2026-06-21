/**
 * THERMAL-PRINTING-10A — server execution executor registry.
 */
import { createExecutionExecutorRegistry } from "../../../shared/printing/executionExecutorRegistry";
import type { ExecutionExecutorRegistry } from "../../../shared/printing/executionExecutorRegistry";
import { createRawEscPosExecutor } from "./rawEscPosExecutor";

let defaultRegistry: ExecutionExecutorRegistry | null = null;

export function createServerExecutorRegistry(): ExecutionExecutorRegistry {
  return createExecutionExecutorRegistry([createRawEscPosExecutor()]);
}

export function getServerExecutorRegistry(): ExecutionExecutorRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createServerExecutorRegistry();
  }
  return defaultRegistry;
}

export function resetServerExecutorRegistryForTests(): void {
  defaultRegistry = null;
}
