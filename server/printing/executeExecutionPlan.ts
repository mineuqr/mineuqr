/**
 * THERMAL-PRINTING-10A — server execution plan dispatch.
 */
import { executeExecutionPlan as executeExecutionPlanShared } from "../../shared/printing/executeExecutionPlan";
import type {
  ExecutionExecutorInput,
  ExecutionResult,
} from "../../shared/printing/executionExecutor";
import { getServerExecutorRegistry } from "./executors/executorRegistry";

export function executeExecutionPlan(
  input: ExecutionExecutorInput
): ExecutionResult {
  return executeExecutionPlanShared(input, getServerExecutorRegistry());
}
