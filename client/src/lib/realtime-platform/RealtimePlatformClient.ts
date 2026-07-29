/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Client platform API — features must not touch EventSource / BC directly.
 */

import {
  DEFAULT_CLIENT_CAPABILITIES,
  RealtimeSequenceTracker,
  type RealtimeChannel,
  type RealtimeClientCapabilities,
  type RealtimeHint,
  type RealtimeHintType,
} from "@shared/realtime-platform";

export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "poll_only"
  | "closed";

export type RealtimeHintHandler = (hint: RealtimeHint) => void;

export type RealtimePlatformHandlers = {
  onHint?: RealtimeHintHandler;
  /** Invoked when seq gap detected — features should refetch. */
  onCatchUp?: (info: { reason: string; hint?: RealtimeHint }) => void;
  onStateChange?: (state: RealtimeConnectionState) => void;
  onFallback?: (reason: string) => void;
};

export type RealtimeConnectOptions = {
  /** Absolute or relative SSE URL including ticket query (built by helper). */
  sseUrl: string;
  channels: RealtimeChannel[];
  clientCapabilities?: Partial<RealtimeClientCapabilities>;
  handlers?: RealtimePlatformHandlers;
  /** Max reconnect attempts before poll_only. */
  maxReconnectAttempts?: number;
};

function emitState(
  handlers: RealtimePlatformHandlers | undefined,
  state: RealtimeConnectionState
): void {
  handlers?.onStateChange?.(state);
}

/**
 * Sole browser entry for realtime. Encapsulates EventSource.
 */
export class RealtimePlatformClient {
  private source: EventSource | null = null;
  private state: RealtimeConnectionState = "idle";
  private seq = new RealtimeSequenceTracker();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private options: RealtimeConnectOptions | null = null;
  private readonly boundVisibility = () => this.onVisibility();
  /** Dedup window for public customer hints (no seq). */
  private readonly recentPublicHintKeys = new Set<string>();

  get connectionState(): RealtimeConnectionState {
    return this.state;
  }

  connect(options: RealtimeConnectOptions): void {
    this.disconnect();
    this.options = options;
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.boundVisibility);
    }
    this.openSource();
  }

  subscribe(
    _channels: RealtimeChannel[],
    handler: RealtimeHintHandler
  ): () => void {
    // Channel set is fixed at connect for v1; handler can be swapped.
    if (!this.options) {
      throw new Error("RealtimePlatformClient.connect() required first");
    }
    const prev = this.options.handlers?.onHint;
    this.options.handlers = {
      ...this.options.handlers,
      onHint: (hint) => {
        prev?.(hint);
        handler(hint);
      },
    };
    return () => {
      if (this.options?.handlers) {
        this.options.handlers.onHint = prev;
      }
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.boundVisibility);
    }
    if (this.source) {
      this.source.close();
      this.source = null;
    }
    this.seq.clear();
    this.recentPublicHintKeys.clear();
    this.state = "closed";
    emitState(this.options?.handlers, "closed");
  }

  /** Test / diagnostics */
  getSequenceTrackerSize(): number {
    return this.seq.size();
  }

  private setState(state: RealtimeConnectionState): void {
    this.state = state;
    emitState(this.options?.handlers, state);
  }

  private openSource(): void {
    if (!this.options) return;
    if (typeof EventSource === "undefined") {
      this.activateFallback("eventsource_unavailable");
      return;
    }

    this.setState(
      this.reconnectAttempts > 0 ? "reconnecting" : "connecting"
    );

    const source = new EventSource(this.options.sseUrl);
    this.source = source;

    source.addEventListener("platform.ready", () => {
      this.reconnectAttempts = 0;
      this.setState("live");
    });

    source.addEventListener("platform.catch_up", (ev) => {
      const data = safeParse(ev);
      this.options?.handlers?.onCatchUp?.({
        reason: (data?.reason as string) ?? "catch_up",
      });
    });

    source.addEventListener("platform.heartbeat", () => {
      /* keepalive */
    });

    // Listen for known hint event names via generic message + typed events.
    source.onmessage = (ev) => this.handleEventData(ev.data);
    for (const type of HINT_EVENT_TYPES) {
      source.addEventListener(type, (ev) => {
        const msg = ev as MessageEvent;
        this.handleEventData(msg.data);
      });
    }

    source.onerror = () => {
      source.close();
      this.source = null;
      this.scheduleReconnect();
    };
  }

  private handleEventData(raw: string): void {
    const data = safeParse(raw);
    if (!data) return;

    // REALTIME-CUSTOMER-TRACKING-ADOPTION-1 — public customer hints omit
    // restaurantId/seq/channel/aggregateId. Invalidate only; no seq tracking.
    if (isPublicCustomerHint(data)) {
      const dedupeKey = `${data.trackingRef}:${data.type}:${data.ts}:${data.correlationId ?? ""}`;
      if (this.recentPublicHintKeys.has(dedupeKey)) return;
      this.recentPublicHintKeys.add(dedupeKey);
      if (this.recentPublicHintKeys.size > 200) {
        const first = this.recentPublicHintKeys.values().next().value;
        if (first) this.recentPublicHintKeys.delete(first);
      }
      this.options?.handlers?.onHint?.(data as unknown as RealtimeHint);
      return;
    }

    const hint = data as unknown as RealtimeHint;
    if (typeof hint.seq !== "number" || !hint.channel) return;

    const decision = this.seq.observe(
      hint.restaurantId,
      hint.channel,
      hint.seq,
      hint.aggregateId
    );

    if (decision.action === "duplicate") return;

    if (decision.action === "gap") {
      this.options?.handlers?.onCatchUp?.({
        reason: "sequence_gap",
        hint,
      });
    }

    // Hints never write cache — only notify. Features invalidate/refetch.
    this.options?.handlers?.onHint?.(hint);
  }

  private scheduleReconnect(): void {
    if (!this.options) return;
    const caps = {
      ...DEFAULT_CLIENT_CAPABILITIES,
      ...this.options.clientCapabilities,
    };
    if (!caps.reconnect) {
      this.activateFallback("reconnect_disabled");
      return;
    }

    const max = this.options.maxReconnectAttempts ?? 8;
    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > max) {
      this.activateFallback("max_reconnects");
      return;
    }

    const delay = Math.min(
      30_000,
      500 * 2 ** Math.min(this.reconnectAttempts, 6)
    );
    this.setState("reconnecting");
    this.reconnectTimer = setTimeout(() => this.openSource(), delay);
  }

  private activateFallback(reason: string): void {
    const caps = {
      ...DEFAULT_CLIENT_CAPABILITIES,
      ...this.options?.clientCapabilities,
    };
    if (caps.pollFallback) {
      this.setState("poll_only");
      this.options?.handlers?.onFallback?.(reason);
    } else {
      this.setState("closed");
    }
  }

  private onVisibility(): void {
    if (typeof document === "undefined" || !this.options) return;
    if (document.visibilityState === "visible" && this.state === "poll_only") {
      this.reconnectAttempts = 0;
      this.openSource();
    }
  }
}

const HINT_EVENT_TYPES: RealtimeHintType[] = [
  "order.created",
  "order.status_changed",
  "order.ready",
  "order.served",
  "order.cancelled",
  "session.opened",
  "session.closed",
  "check.paid",
  "check.voided",
  "kitchen.queue_changed",
  "expo.queue_changed",
  "notification.raised",
  "notification.cleared",
  "device.connected",
  "device.disconnected",
  "device.config_changed",
  "printer.online",
  "printer.offline",
  "print.job_changed",
  "dashboard.metric_changed",
  "customer.status_changed",
];

function safeParse(ev: { data?: string } | string): Record<string, unknown> | null {
  try {
    const raw = typeof ev === "string" ? ev : ev.data;
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isPublicCustomerHint(data: Record<string, unknown>): boolean {
  return (
    typeof data.type === "string" &&
    typeof data.trackingRef === "string" &&
    typeof data.ts === "string" &&
    data.restaurantId === undefined &&
    data.aggregateId === undefined &&
    data.seq === undefined
  );
}

/** Build SSE URL from mintTicket result — features use this helper only. */
export function buildRealtimeSseUrl(input: {
  ssePath: string;
  token: string;
  channels?: RealtimeChannel[];
  origin?: string;
}): string {
  const base = input.origin ?? (typeof window !== "undefined" ? "" : "");
  const url = new URL(input.ssePath, base || "http://localhost");
  url.searchParams.set("ticket", input.token);
  if (input.channels?.length) {
    url.searchParams.set("channels", input.channels.join(","));
  }
  // Return path+query when browser-relative
  if (!input.origin && typeof window !== "undefined") {
    return `${url.pathname}${url.search}`;
  }
  return url.toString();
}

/**
 * Platform broadcast bridge — wraps BroadcastChannel.
 * Features must use this instead of `new BroadcastChannel`.
 */
export class RealtimeBroadcastBridge {
  private channel: BroadcastChannel | null = null;

  constructor(private readonly name: string) {}

  publish(message: unknown): void {
    if (typeof BroadcastChannel === "undefined") return;
    try {
      const ch = new BroadcastChannel(this.name);
      ch.postMessage(message);
      ch.close();
    } catch {
      /* ignore */
    }
  }

  subscribe(handler: (message: unknown) => void): () => void {
    if (typeof BroadcastChannel === "undefined") return () => {};
    try {
      this.channel = new BroadcastChannel(this.name);
      this.channel.onmessage = (ev) => handler(ev.data);
      return () => {
        try {
          this.channel?.close();
        } catch {
          /* ignore */
        }
        this.channel = null;
      };
    } catch {
      return () => {};
    }
  }
}

/** Singleton facade for app bootstrap (features import from here only). */
let sharedClient: RealtimePlatformClient | null = null;

export function getRealtimePlatform(): RealtimePlatformClient {
  if (!sharedClient) sharedClient = new RealtimePlatformClient();
  return sharedClient;
}

export function __resetRealtimePlatformForTests(): void {
  sharedClient?.disconnect();
  sharedClient = null;
}
