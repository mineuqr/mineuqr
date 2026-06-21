/**
 * THERMAL-PRINTING-9D — execution authority declaration.
 *
 * Authoritative runtime path: agent assignment → fetch → context/strategy → consumption placeholder.
 * Legacy dormant path: printProcessorWorker (pre-agent server placeholder; not scheduled in production).
 */
export const AUTHORITATIVE_EXECUTION_PATH = "agent-runtime" as const;

export const LEGACY_DORMANT_EXECUTION_PATH = "print-processor-worker" as const;

export type ExecutionPathAuthority =
  | typeof AUTHORITATIVE_EXECUTION_PATH
  | typeof LEGACY_DORMANT_EXECUTION_PATH;
