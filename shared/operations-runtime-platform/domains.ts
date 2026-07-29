/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Domain ownership — architecture SSOT only (no workers / queues / schedulers).
 */

export const OPERATIONS_RUNTIME_PLATFORM_PROGRAM =
  "OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1" as const;

export const RUNTIME_DOMAINS = [
  "job_scheduling",
  "job_execution",
  "workers",
  "queues",
  "event_bus",
  "event_dispatch",
  "event_processing",
  "retries",
  "dead_letters",
  "runtime_health",
  "runtime_diagnostics",
  "future_automation",
] as const;

export type RuntimeDomainId = (typeof RUNTIME_DOMAINS)[number];

export type RuntimeDomainMaturity =
  | "architecture"
  | "ssot_consumer"
  | "reserved"
  | "deferred"
  | "adr_governed";

export type RuntimeDomainDefinition = {
  id: RuntimeDomainId;
  title: string;
  ownership: string;
  maturity: RuntimeDomainMaturity;
  notes: string;
  adrRefs?: readonly string[];
};

export const RUNTIME_DOMAIN_DEFINITIONS: readonly RuntimeDomainDefinition[] = [
  {
    id: "job_scheduling",
    title: "Job Scheduling",
    ownership: "Operations Runtime Platform",
    maturity: "architecture",
    notes: "Scheduled / recurring / delayed job reservation — no scheduler implementation.",
  },
  {
    id: "job_execution",
    title: "Job Execution",
    ownership: "Operations Runtime Platform",
    maturity: "architecture",
    notes: "Execution metadata and policies — workers not implemented.",
  },
  {
    id: "workers",
    title: "Workers",
    ownership: "Operations Runtime Platform (reserved)",
    maturity: "reserved",
    notes: "Dedicated / shared / retry / maintenance workers — future only.",
  },
  {
    id: "queues",
    title: "Queues",
    ownership: "Operations Runtime Platform (reserved)",
    maturity: "reserved",
    notes: "FIFO / priority / delayed / DLQ / back-pressure — future only.",
  },
  {
    id: "event_bus",
    title: "Event Bus",
    ownership: "Existing Event / Outbox platforms (SSOT); Runtime presents diagnostics",
    maturity: "ssot_consumer",
    notes: "No new event bus. Runtime does not own business event contracts.",
    adrRefs: ["ADR-ARCH-014", "ADR-ARCH-021"],
  },
  {
    id: "event_dispatch",
    title: "Event Dispatch",
    ownership: "Existing Event Pipeline (SSOT)",
    maturity: "ssot_consumer",
    notes: "Dispatcher ownership unchanged; Runtime observes execution only.",
    adrRefs: ["ADR-ARCH-014"],
  },
  {
    id: "event_processing",
    title: "Event Processing",
    ownership: "Domain consumers + ADR governance; Runtime owns infrastructure telemetry",
    maturity: "adr_governed",
    notes: "Business consumers remain domain-owned. Idempotency per ADR-014/021.",
    adrRefs: ["ADR-ARCH-014", "ADR-ARCH-021"],
  },
  {
    id: "retries",
    title: "Retries",
    ownership: "Operations Runtime Platform (architecture)",
    maturity: "architecture",
    notes: "Retry policy ownership for infrastructure jobs/queues — not implemented.",
  },
  {
    id: "dead_letters",
    title: "Dead Letters",
    ownership: "Operations Runtime Platform (architecture)",
    maturity: "architecture",
    notes: "DLQ transition and analysis — read-only diagnostics later.",
  },
  {
    id: "runtime_health",
    title: "Runtime Health",
    ownership: "Operations Runtime Platform",
    maturity: "architecture",
    notes: "Threshold-driven health model — evaluation deferred.",
  },
  {
    id: "runtime_diagnostics",
    title: "Runtime Diagnostics",
    ownership: "Operations Runtime Platform",
    maturity: "architecture",
    notes: "Read-only failure correlation / timelines — no runtime mutation.",
  },
  {
    id: "future_automation",
    title: "Future Automation",
    ownership: "Operations Runtime Platform (reserved)",
    maturity: "reserved",
    notes: "Automation playbooks reserved — not in this program.",
  },
] as const;
