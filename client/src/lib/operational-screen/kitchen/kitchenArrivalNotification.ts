import type { KitchenRuntimeQueue } from "./kitchenRuntimeReadModel";

/** Runtime notification event — one type only: new pending order first visibility. */
export type KitchenArrivalNotificationEvent = Readonly<{
  newArrivals: readonly number[];
  played: boolean;
}>;

export type KitchenArrivalNotificationState = Readonly<{
  announcedPendingOrderIds: ReadonlySet<number>;
  baselineEstablished: boolean;
  lastBaselineToken: string | null;
}>;

export type KitchenArrivalProcessMode = "skip" | "baseline" | "observe";

export type KitchenArrivalProcessInput = Readonly<{
  pendingOrderIds: readonly number[];
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
  announcedPendingOrderIds: new Set(),
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

export function collectFilteredPendingOrderIds(queue: KitchenRuntimeQueue): number[] {
  return queue.columns.pending.map((ticket) => ticket.orderId);
}

/**
 * Resolve whether the runtime should skip, baseline, or observe pending arrivals.
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
  const announced = new Set(state.announcedPendingOrderIds);

  if (input.mode === "baseline") {
    for (const orderId of input.pendingOrderIds) {
      announced.add(orderId);
    }
    return {
      newArrivals: [],
      nextState: {
        announcedPendingOrderIds: announced,
        baselineEstablished: true,
        lastBaselineToken: state.lastBaselineToken,
      },
    };
  }

  const newArrivals: number[] = [];
  for (const orderId of input.pendingOrderIds) {
    if (announced.has(orderId)) continue;
    newArrivals.push(orderId);
    announced.add(orderId);
  }

  return {
    newArrivals,
    nextState: {
      announcedPendingOrderIds: announced,
      baselineEstablished: true,
      lastBaselineToken: state.lastBaselineToken,
    },
  };
}

export type KitchenArrivalSoundPlayer = () => boolean;

/**
 * KITCHEN-NOTIFICATION-ARCHITECTURE-1 — runtime arrival notification authority.
 * Detects first visibility of pending orders after kitchen item filtering.
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

    const pendingOrderIds = collectFilteredPendingOrderIds(queue);
    const stateForProcess: KitchenArrivalNotificationState = {
      ...this.state,
      lastBaselineToken:
        input.mode === "baseline" ? input.baselineToken : this.state.lastBaselineToken,
    };

    const result = processKitchenOrderArrivals(stateForProcess, {
      pendingOrderIds,
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
