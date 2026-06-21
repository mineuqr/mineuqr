/**
 * THERMAL-PRINTING-10A — server execution plan dispatch.
 */
import { executeExecutionPlan as executeExecutionPlanShared } from "../../shared/printing/executeExecutionPlan";
import type {
  ExecutionExecutorInput,
  ExecutionExecutionResult,
} from "../../shared/printing/executionExecutor";
import { getServerExecutorRegistry } from "./executors/executorRegistry";

export function executeExecutionPlan(
  input: ExecutionExecutorInput
): ExecutionExecutionResult {
  return executeExecutionPlanShared(input, getServerExecutorRegistry());
}
