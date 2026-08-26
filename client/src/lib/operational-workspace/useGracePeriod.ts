import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const GRACE_PERIOD_MS = 45_000;

type GraceEntry<T> = {
  item: T;
  removedAt: number;
};

function graceMapsEqual<T>(a: Map<string, GraceEntry<T>>, b: Map<string, GraceEntry<T>>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const [key, entry] of Array.from(a.entries())) {
    const other = b.get(key);
    if (!other || other.item !== entry.item || other.removedAt !== entry.removedAt) {
      return false;
    }
  }
  return true;
}

export type GracePeriodOptions<T> = {
  /**
   * ORDERS-SERVE-ACTION-UX-AND-STATE-FIX-1
   * When false, a removed item is not re-inserted as a live-looking snapshot.
   * Default retains the existing 45s grace for non-terminal cases.
   */
  retainRemoved?: (item: T) => boolean;
};

export function useGracePeriod<T>(
  items: T[],
  keyFn: (item: T) => string,
  options?: GracePeriodOptions<T>
) {
  const [grace, setGrace] = useState<Map<string, GraceEntry<T>>>(new Map());
  const prevItemsRef = useRef<T[]>([]);
  const keyFnRef = useRef(keyFn);
  keyFnRef.current = keyFn;
  const retainRemovedRef = useRef(options?.retainRemoved);
  retainRemovedRef.current = options?.retainRemoved;

  useEffect(() => {
    const resolveKey = (item: T) => keyFnRef.current(item);
    const currentKeys = new Set(items.map(resolveKey));
    const prevItems = prevItemsRef.current;

    setGrace((prev) => {
      const now = Date.now();
      let next: Map<string, GraceEntry<T>> | null = null;

      const ensureNext = () => {
        if (!next) next = new Map(prev);
        return next;
      };

      for (const [key, entry] of Array.from(prev.entries())) {
        if (now - entry.removedAt >= GRACE_PERIOD_MS) {
          ensureNext().delete(key);
        }
      }

      for (const item of prevItems) {
        const key = resolveKey(item);
        if (!currentKeys.has(key)) {
          if (retainRemovedRef.current?.(item) === false) {
            continue;
          }
          ensureNext().set(key, { item, removedAt: now });
        }
      }

      if (!next) return prev;
      return graceMapsEqual(prev, next) ? prev : next;
    });

    prevItemsRef.current = items;
  }, [items]);

  const displayItems = useMemo(() => {
    const resolveKey = (item: T) => keyFnRef.current(item);
    const merged = [...items];
    const seen = new Set(items.map(resolveKey));
    const now = Date.now();

    for (const [key, entry] of Array.from(grace.entries())) {
      if (!seen.has(key) && now - entry.removedAt < GRACE_PERIOD_MS) {
        merged.push(entry.item);
      }
    }

    return merged;
  }, [items, grace]);

  const isFading = useCallback(
    (item: T) => {
      const key = keyFnRef.current(item);
      return grace.has(key) && !items.some((row) => keyFnRef.current(row) === key);
    },
    [items, grace]
  );

  return { displayItems, isFading, gracePeriodMs: GRACE_PERIOD_MS };
}
