export type OpsCategory =
  | "AUTH"
  | "TENANT"
  | "ADMIN"
  | "RUNTIME"
  | "SYSTEM"
  | "PAYMENT"
  | "WEBHOOK"
  | "ORDER"
  | "EMAIL";

export type OpsSeverity = "debug" | "info" | "warn" | "error";

export interface OpsEvent {
  type: string;
  category: OpsCategory;
  severity: OpsSeverity;
  ts: string;

  correlationId?: string;

  actorId?: number | null;
  role?: string | null;
  restaurantId?: number | null;

  /** HTTP route / Express path (e.g. `/api/auth/login`). */
  route?: string;

  /** tRPC procedure path (e.g. `restaurant.update`). */
  procedure?: string;

  /** Semantic operation (e.g. `delete_table`, `update_offer`). */
  action?: string;

  ip?: string;
  method?: string;

  metadata?: Record<string, unknown>;
}

type LegacyMetadata = {
  legacyPrefix?: string;
  legacyType?: string;
};

function isJsonMode(): boolean {
  return process.env.OPS_LOG_JSON === "1";
}

function consoleFnForSeverity(severity: OpsSeverity): (msg?: unknown, ...args: unknown[]) => void {
  switch (severity) {
    case "error":
      return console.error;
    case "warn":
      return console.warn;
    case "info":
      return console.info;
    case "debug":
    default:
      return console.log;
  }
}

/**
 * Lightweight structured operational logger (MON-1A).
 *
 * - Human-readable by default: `[OPS][CATEGORY][severity] type` + event object
 * - Optional JSON mode (disabled by default): `OPS_LOG_JSON=1` emits a single JSON line
 */
export function opsLog(event: OpsEvent): void {
  const fn = consoleFnForSeverity(event.severity);

  if (isJsonMode()) {
    fn(JSON.stringify(event));
    return;
  }

  const legacy = (event.metadata ?? {}) as LegacyMetadata;
  const legacyPrefix =
    typeof legacy.legacyPrefix === "string" ? legacy.legacyPrefix : undefined;
  const legacyType =
    typeof legacy.legacyType === "string" ? legacy.legacyType : undefined;

  const message =
    legacyPrefix && legacyType
      ? `[${legacyPrefix}] ${legacyType}`
      : `[OPS][${event.category}][${event.severity}] ${event.type}`;

  // Avoid leaking internal legacy keys into the visible payload.
  const { legacyPrefix: _lp, legacyType: _lt, ...metadata } =
    (event.metadata ?? {}) as Record<string, unknown>;
  const payload: OpsEvent = Object.keys(metadata).length
    ? { ...event, metadata }
    : { ...event, metadata: undefined };

  fn(message, payload);
}

