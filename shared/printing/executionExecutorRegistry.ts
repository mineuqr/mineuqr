/**
 * THERMAL-PRINTING-10A — execution executor registry (method → executor).
 */
import { EXECUTION_METHODS, type ExecutionMethod } from "./executionCapabilities";
import type { ExecutionExecutor, ExecutionExecutorInput, ExecutionExecutionResult } from "./executionExecutor";

export type ExecutionExecutorRegistry = {
  get(method: ExecutionMethod): ExecutionExecutor | undefined;
  listSupported(): ExecutionMethod[];
  listNotImplemented(): ExecutionMethod[];
};

class NotImplementedExecutor implements ExecutionExecutor {
  readonly method: ExecutionMethod;

  constructor(method: ExecutionMethod) {
    this.method = method;
  }

  execute(input: ExecutionExecutorInput): ExecutionExecutionResult {
    return {
      status: "not-implemented",
      method: this.method,
      message: `Executor not implemented: ${this.method}`,
    };
  }
}

export function createExecutionExecutorRegistry(
  executors: readonly ExecutionExecutor[]
): ExecutionExecutorRegistry {
  const byMethod = new Map<ExecutionMethod, ExecutionExecutor>();
  for (const executor of executors) {
    byMethod.set(executor.method, executor);
  }

  const supported = executors.map((executor) => executor.method);
  const notImplemented = EXECUTION_METHODS.filter((method) => !byMethod.has(method));

  return {
    get(method: ExecutionMethod): ExecutionExecutor | undefined {
      const executor = byMethod.get(method);
      if (executor) {
        return executor;
      }
      if (notImplemented.includes(method)) {
        return new NotImplementedExecutor(method);
      }
      return undefined;
    },
    listSupported(): ExecutionMethod[] {
      return [...supported];
    },
    listNotImplemented(): ExecutionMethod[] {
      return [...notImplemented];
    },
  };
}
