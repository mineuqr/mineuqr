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

function safeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function safeIdToken(value: unknown, maxLen = 64): string | undefined {
  const str = safeString(value);
  if (!str) return undefined;
  return str.length <= maxLen ? str : str.slice(0, maxLen);
}

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
 * Taxonomy guidance (MON-1D):
 * - type: snake_case, stable vocabulary (prefer `opsTaxonomy.ts`)
 * - route: HTTP route / Express path
 * - procedure: tRPC procedure path
 * - action: semantic operation (avoid using for query/mutation kind)
 * - severity:
 *   - debug: optional diagnostics
 *   - info: expected meaningful events
 *   - warn: suspicious/denied/degraded
 *   - error: unexpected failures
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

  const baseMessage =
    legacyPrefix && legacyType
      ? `[${legacyPrefix}] ${legacyType}`
      : `[OPS][${event.category}][${event.severity}] ${event.type}`;

  // Avoid leaking internal legacy keys into the visible payload.
  const { legacyPrefix: _lp, legacyType: _lt, ...metadata } =
    (event.metadata ?? {}) as Record<string, unknown>;
  const payload: OpsEvent = Object.keys(metadata).length
    ? { ...event, metadata }
    : { ...event, metadata: undefined };

  // Diagnostics UX (MON-1R.4): add lightweight breadcrumbs to the *message line*
  // so operators can follow flows without expanding objects.
  // Keep this compact and best-effort; payload remains the source of truth.
  if (legacyPrefix && legacyType) {
    fn(baseMessage, payload);
    return;
  }

  const tokens: string[] = [];
  const cid = safeIdToken(payload.correlationId, 64);
  if (cid) tokens.push(`cid=${cid}`);

  const proc = safeIdToken(payload.procedure, 80);
  if (proc) tokens.push(`proc=${proc}`);

  const route = safeIdToken(payload.route, 80);
  if (route) tokens.push(`route=${route}`);

  const provider = safeIdToken(payload.metadata?.provider, 32);
  if (provider) tokens.push(`provider=${provider}`);

  const providerEventId = safeIdToken(payload.metadata?.providerEventId, 64);
  if (providerEventId) tokens.push(`eventId=${providerEventId}`);

  // Message-line "reason=" is degradedReason only (unexpected failures).
  // Token/user classifiers use metadata.reason — expand the payload object.
  const degradedReason = safeIdToken(payload.metadata?.degradedReason, 48);
  if (degradedReason) tokens.push(`reason=${degradedReason}`);

  const message = tokens.length > 0 ? `${baseMessage} ${tokens.join(" ")}` : baseMessage;
  fn(message, payload);
}

