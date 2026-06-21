/**
 * THERMAL-PRINTING-10A — raw-escpos executor (payload generation only, no device I/O).
 */
import { buildEscPosPayloadFromAgentTicket } from "../../../shared/printing/escposPayloadBuilder";
import type {
  ExecutionExecutor,
  ExecutionExecutorInput,
  ExecutionExecutionResult,
} from "../../../shared/printing/executionExecutor";

export const RAW_ESC_POS_EXECUTOR_METHOD = "raw-escpos" as const;

export class RawEscPosExecutor implements ExecutionExecutor {
  readonly method = RAW_ESC_POS_EXECUTOR_METHOD;

  execute(input: ExecutionExecutorInput): ExecutionExecutionResult {
    try {
      const artifact = buildEscPosPayloadFromAgentTicket({
        ticket: input.job.ticket,
      });

      return {
        status: "completed",
        method: this.method,
        artifact,
      };
    } catch (error) {
      return {
        status: "failed",
        method: this.method,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export function createRawEscPosExecutor(): RawEscPosExecutor {
  return new RawEscPosExecutor();
}
