/**
 * REALTIME-ORDERS-ADOPTION-1
 * Debounced listActive invalidation — shared by SSE hints + BroadcastChannel.
 * Prevents invalidate storms when both fire for the same transition.
 */

const DEFAULT_DEBOUNCE_MS = 75;

type Entry = {
  timer: ReturnType<typeof setTimeout> | null;
  lastKey: string | null;
};

const byRestaurant = new Map<number, Entry>();

export function scheduleOrdersListActiveInvalidation(input: {
  restaurantId: number;
  invalidate: () => void;
  /** Dedup key e.g. aggregateId:seq or "broadcast" */
  dedupeKey?: string;
  debounceMs?: number;
}): void {
  const { restaurantId, invalidate } = input;
  const debounceMs = input.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let entry = byRestaurant.get(restaurantId);
  if (!entry) {
    entry = { timer: null, lastKey: null };
    byRestaurant.set(restaurantId, entry);
  }

  if (
    input.dedupeKey &&
    entry.lastKey === input.dedupeKey &&
    entry.timer != null
  ) {
    return;
  }
  if (input.dedupeKey) entry.lastKey = input.dedupeKey;

  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    entry!.timer = null;
    entry!.lastKey = null;
    invalidate();
  }, debounceMs);
}

export function __resetOrdersInvalidationCoordinatorForTests(): void {
  for (const entry of byRestaurant.values()) {
    if (entry.timer) clearTimeout(entry.timer);
  }
  byRestaurant.clear();
}
