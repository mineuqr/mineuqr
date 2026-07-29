/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Retry architecture — ownership only; no implementation.
 */

export const RETRY_ARCHITECTURE_CAPABILITIES = [
  "max_attempts",
  "exponential_backoff",
  "retry_windows",
  "failure_escalation",
  "dead_letter_transition",
] as const;

export type RetryArchitectureCapabilityId =
  (typeof RETRY_ARCHITECTURE_CAPABILITIES)[number];

export type RetryArchitectureDefinition = {
  id: RetryArchitectureCapabilityId;
  title: string;
  maturity: "architecture";
  implemented: false;
  notes: string;
};

export const RETRY_ARCHITECTURE: readonly RetryArchitectureDefinition[] = [
  {
    id: "max_attempts",
    title: "Max Attempts",
    maturity: "architecture",
    implemented: false,
    notes: "Policy ownership defined; enforcement deferred.",
  },
  {
    id: "exponential_backoff",
    title: "Exponential Backoff",
    maturity: "architecture",
    implemented: false,
    notes: "Backoff strategy reserved.",
  },
  {
    id: "retry_windows",
    title: "Retry Windows",
    maturity: "architecture",
    implemented: false,
    notes: "Time-boxed retry windows reserved.",
  },
  {
    id: "failure_escalation",
    title: "Failure Escalation",
    maturity: "architecture",
    implemented: false,
    notes: "Escalate to alerts / ops — via Alert Platform, no fork.",
  },
  {
    id: "dead_letter_transition",
    title: "Dead Letter Transition",
    maturity: "architecture",
    implemented: false,
    notes: "Move exhausted retries to DLQ — future queue platform.",
  },
] as const;
