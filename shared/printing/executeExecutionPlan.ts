/**
 * THERMAL-PRINTING-10A — execution plan dispatch (consumes executionPlan.method only).
 */
import { isExecutionMethod } from "./executionCapabilities";
import type {
  ExecutionExecutorInput,
  ExecutionResult,
} from "./executionExecutor";
import type { ExecutionExecutorRegistry } from "./executionExecutorRegistry";

export function executeExecutionPlan(
  input: ExecutionExecutorInput,
  registry: ExecutionExecutorRegistry
): ExecutionResult {
  const { executionPlan } = input;

  if (!executionPlan.strategyResolved) {
    return {
      status: "rejected",
      method: executionPlan.method ?? "raw-escpos",
      message: executionPlan.message ?? "Execution strategy not resolved",
    };
  }

  if (!executionPlan.method) {
    return {
      status: "rejected",
      method: "raw-escpos",
      message: executionPlan.message ?? "Execution method missing from plan",
    };
  }

  if (!isExecutionMethod(executionPlan.method)) {
    return {
      status: "rejected",
      method: executionPlan.method,
      message: `Unsupported execution method: ${executionPlan.method}`,
    };
  }

  const executor = registry.get(executionPlan.method);
  if (!executor) {
    return {
      status: "not-implemented",
      method: executionPlan.method,
      message: `No executor registered for method: ${executionPlan.method}`,
    };
  }

  return executor.execute(input);
}
