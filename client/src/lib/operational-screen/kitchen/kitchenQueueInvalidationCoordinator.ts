/**
 * REALTIME-KITCHEN-ADOPTION-1
 * Debounced kitchen queue refetch — shared by SSE hints + BroadcastChannel.
 */

const DEFAULT_DEBOUNCE_MS = 75;

type Entry = {
  timer: ReturnType<typeof setTimeout> | null;
};

const byRestaurant = new Map<number, Entry>();

export function scheduleKitchenQueueInvalidation(input: {
  restaurantId: number;
  invalidate: () => void;
  debounceMs?: number;
}): void {
  const { restaurantId, invalidate } = input;
  const debounceMs = input.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let entry = byRestaurant.get(restaurantId);
  if (!entry) {
    entry = { timer: null };
    byRestaurant.set(restaurantId, entry);
  }
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    entry!.timer = null;
    invalidate();
  }, debounceMs);
}

export function __resetKitchenQueueInvalidationCoordinatorForTests(): void {
  for (const entry of byRestaurant.values()) {
    if (entry.timer) clearTimeout(entry.timer);
  }
  byRestaurant.clear();
}
