/**
 * THERMAL-PRINTING-10A — agent execution executor registry.
 */
import { createExecutionExecutorRegistry } from "../../../shared/printing/executionExecutorRegistry";
import type { ExecutionExecutorRegistry } from "../../../shared/printing/executionExecutorRegistry";
import { createRawEscPosExecutor } from "./rawEscPosExecutor";

let defaultRegistry: ExecutionExecutorRegistry | null = null;

export function createAgentExecutorRegistry(): ExecutionExecutorRegistry {
  return createExecutionExecutorRegistry([createRawEscPosExecutor()]);
}

export function getAgentExecutorRegistry(): ExecutionExecutorRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createAgentExecutorRegistry();
  }
  return defaultRegistry;
}

export function resetAgentExecutorRegistryForTests(): void {
  defaultRegistry = null;
}
