import type { KitchenRuntimeQueue, KitchenRuntimeTicket } from "./kitchenRuntimeReadModel";

/** Runtime notification event — one type only: first filtered-runtime visibility. */
export type KitchenArrivalNotificationEvent = Readonly<{
  newArrivals: readonly number[];
  played: boolean;
}>;

export type KitchenArrivalNotificationState = Readonly<{
  announcedVisibleOrderIds: ReadonlySet<number>;
  baselineEstablished: boolean;
  lastBaselineToken: string | null;
}>;

export type KitchenArrivalProcessMode = "skip" | "baseline" | "observe";

export type KitchenArrivalProcessInput = Readonly<{
  visibleOrderIds: readonly number[];
  mode: Exclude<KitchenArrivalProcessMode, "skip">;
}>;

export type KitchenArrivalBaselineContext = Readonly<{
  baselineEstablished: boolean;
  lastBaselineToken: string | null;
  baselineToken: string;
  connectivityState: string;
  isShowingStaleData: boolean;
  isQueueError: boolean;
  isLoading: boolean;
  hasQueue: boolean;
}>;

export const EMPTY_KITCHEN_ARRIVAL_STATE: KitchenArrivalNotificationState = {
  announcedVisibleOrderIds: new Set(),
  baselineEstablished: false,
  lastBaselineToken: null,
};

export function buildKitchenArrivalBaselineToken(input: {
  categoryFilterVersion: number;
  configurationVersion: string | null;
  reconnectCount: number;
}): string {
  return `${input.configurationVersion ?? "none"}:${input.categoryFilterVersion}:${input.reconnectCount}`;
}

/**
 * KITCHEN-ARRIVAL-SEMANTICS-1 — collect order ids visible on this kitchen screen
 * after runtime projection and item filtering (all pipeline columns).
 */
export function collectFilteredVisibleOrderIds(queue: KitchenRuntimeQueue): number[] {
  const ids = new Set<number>();
  for (const ticket of queue.columns.pending) {
    ids.add(ticket.orderId);
  }
  for (const ticket of queue.columns.preparing) {
    ids.add(ticket.orderId);
  }
  for (const ticket of queue.columns.ready) {
    ids.add(ticket.orderId);
  }
  return Array.from(ids);
}

/**
 * Resolve whether the runtime should skip, baseline, or observe arrivals.
 * Baseline suppresses notifications for existing tickets (refresh, reconnect, config reload).
 */
export function resolveKitchenArrivalProcessMode(
  ctx: KitchenArrivalBaselineContext
): KitchenArrivalProcessMode {
  if (ctx.isLoading || !ctx.hasQueue) {
    return "skip";
  }
  if (ctx.isShowingStaleData || ctx.isQueueError) {
    return "skip";
  }
  if (
    ctx.connectivityState === "reconnecting" ||
    ctx.connectivityState === "connecting" ||
    ctx.connectivityState === "disconnected" ||
    ctx.connectivityState === "offline"
  ) {
    return "skip";
  }
  if (!ctx.baselineEstablished || ctx.lastBaselineToken !== ctx.baselineToken) {
    return "baseline";
  }
  return "observe";
}

/** Pure arrival diff — runtime owns the decision; no UI logic. */
export function processKitchenOrderArrivals(
  state: KitchenArrivalNotificationState,
  input: KitchenArrivalProcessInput
): { newArrivals: number[]; nextState: KitchenArrivalNotificationState } {
  const announced = new Set(state.announcedVisibleOrderIds);

  if (input.mode === "baseline") {
    for (const orderId of input.visibleOrderIds) {
      announced.add(orderId);
    }
    return {
      newArrivals: [],
      nextState: {
        announcedVisibleOrderIds: announced,
        baselineEstablished: true,
        lastBaselineToken: state.lastBaselineToken,
      },
    };
  }

  const newArrivals: number[] = [];
  for (const orderId of input.visibleOrderIds) {
    if (announced.has(orderId)) continue;
    newArrivals.push(orderId);
    announced.add(orderId);
  }

  return {
    newArrivals,
    nextState: {
      announcedVisibleOrderIds: announced,
      baselineEstablished: true,
      lastBaselineToken: state.lastBaselineToken,
    },
  };
}

export type KitchenArrivalSoundPlayer = () => boolean;

/**
 * KITCHEN-NOTIFICATION-ARCHITECTURE-1 — runtime arrival notification authority.
 * KITCHEN-ARRIVAL-SEMANTICS-1 — first visibility in filtered kitchen runtime projection.
 */
export class KitchenArrivalNotificationManager {
  private state: KitchenArrivalNotificationState = EMPTY_KITCHEN_ARRIVAL_STATE;

  constructor(private readonly playSound: KitchenArrivalSoundPlayer) {}

  getState(): KitchenArrivalNotificationState {
    return this.state;
  }

  reset(): void {
    this.state = EMPTY_KITCHEN_ARRIVAL_STATE;
  }

  processFilteredQueue(
    queue: KitchenRuntimeQueue | null,
    input: Readonly<{
      mode: KitchenArrivalProcessMode;
      baselineToken: string;
    }>
  ): KitchenArrivalNotificationEvent {
    if (input.mode === "skip" || queue == null) {
      return { newArrivals: [], played: false };
    }

    const visibleOrderIds = collectFilteredVisibleOrderIds(queue);
    const stateForProcess: KitchenArrivalNotificationState = {
      ...this.state,
      lastBaselineToken:
        input.mode === "baseline" ? input.baselineToken : this.state.lastBaselineToken,
    };

    const result = processKitchenOrderArrivals(stateForProcess, {
      visibleOrderIds,
      mode: input.mode,
    });

    const nextState: KitchenArrivalNotificationState = {
      ...result.nextState,
      lastBaselineToken:
        input.mode === "baseline" ? input.baselineToken : this.state.lastBaselineToken,
    };
    this.state = nextState;

    if (input.mode === "observe" && result.newArrivals.length > 0) {
      const played = this.playSound();
      return { newArrivals: result.newArrivals, played };
    }

    return { newArrivals: result.newArrivals, played: false };
  }

  dispose(): void {
    this.reset();
  }
}
