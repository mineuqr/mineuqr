/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Queue Platform — reserved architecture only.
 */

export const QUEUE_CAPABILITIES = [
  "fifo",
  "priority",
  "delayed",
  "retry",
  "dead_letter_queue",
  "back_pressure",
] as const;

export type QueueCapabilityId = (typeof QUEUE_CAPABILITIES)[number];

export type QueueCapabilityArchitecture = {
  id: QueueCapabilityId;
  title: string;
  maturity: "reserved";
  notes: string;
};

export const QUEUE_PLATFORM_ARCHITECTURE: readonly QueueCapabilityArchitecture[] =
  [
    { id: "fifo", title: "FIFO", maturity: "reserved", notes: "Future implementation only." },
    { id: "priority", title: "Priority", maturity: "reserved", notes: "Future implementation only." },
    { id: "delayed", title: "Delayed", maturity: "reserved", notes: "Future implementation only." },
    { id: "retry", title: "Retry", maturity: "reserved", notes: "Future implementation only." },
    { id: "dead_letter_queue", title: "Dead Letter Queue", maturity: "reserved", notes: "Future implementation only." },
    { id: "back_pressure", title: "Back Pressure", maturity: "reserved", notes: "Future implementation only." },
  ] as const;
