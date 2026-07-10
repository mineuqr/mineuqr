import type { FrozenRuntimeInstanceContext } from "./runtimeInstanceContext";

/** Extensible change reasons — additive string union for forward compatibility. */
export type RuntimeContextChangeReason =
  | "bootstrap"
  | "heartbeat_refresh"
  | "configuration_reload"
  | "repairing"
  | "manual_refresh";

export type RuntimeContextChanged = {
  previousContext: FrozenRuntimeInstanceContext | null;
  currentContext: FrozenRuntimeInstanceContext | null;
  reason: RuntimeContextChangeReason;
  changedAt: string;
};

export type RuntimeContextSubscriber = (event: RuntimeContextChanged) => void;

export type RuntimeContextSubscription = {
  unsubscribe: () => void;
};

/**
 * RUNTIME-CONTEXT-CONSOLIDATION-1 — instance-scoped owner of RuntimeInstanceContext.
 * Never resolves or constructs context; RuntimeContextFactory remains sole creator.
 */
export class RuntimeContextStore {
  private current: FrozenRuntimeInstanceContext | null = null;
  private readonly subscribers = new Set<RuntimeContextSubscriber>();

  getCurrentSnapshot(): FrozenRuntimeInstanceContext | null {
    return this.current;
  }

  subscribe(listener: RuntimeContextSubscriber): RuntimeContextSubscription {
    this.subscribers.add(listener);
    return {
      unsubscribe: () => this.unsubscribe(listener),
    };
  }

  unsubscribe(listener: RuntimeContextSubscriber): void {
    this.subscribers.delete(listener);
  }

  /**
   * Atomically replaces the snapshot, then notifies subscribers with a complete event.
   * Subscribers always receive fully frozen snapshots — never partial updates.
   */
  replaceSnapshot(
    snapshot: FrozenRuntimeInstanceContext | null,
    reason: RuntimeContextChangeReason
  ): RuntimeContextChanged {
    const previousContext = this.current;
    this.current = snapshot;
    const event: RuntimeContextChanged = {
      previousContext,
      currentContext: snapshot,
      reason,
      changedAt: new Date().toISOString(),
    };
    for (const listener of this.subscribers) {
      listener(event);
    }
    return event;
  }
}

export function createRuntimeContextStore(): RuntimeContextStore {
  return new RuntimeContextStore();
}

/** React useSyncExternalStore adapter for an instance-scoped store. */
export function subscribeRuntimeContextStore(
  store: RuntimeContextStore,
  onStoreChange: () => void
): () => void {
  return store.subscribe(() => onStoreChange()).unsubscribe;
}

export function getRuntimeContextStoreSnapshot(
  store: RuntimeContextStore
): FrozenRuntimeInstanceContext | null {
  return store.getCurrentSnapshot();
}

export function getRuntimeContextStoreServerSnapshot(): FrozenRuntimeInstanceContext | null {
  return null;
}
