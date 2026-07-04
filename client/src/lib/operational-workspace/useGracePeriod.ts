import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const GRACE_PERIOD_MS = 45_000;

type GraceEntry<T> = {
  item: T;
  removedAt: number;
};

export function useGracePeriod<T>(items: T[], keyFn: (item: T) => string) {
  const [grace, setGrace] = useState<Map<string, GraceEntry<T>>>(new Map());
  const prevItemsRef = useRef<T[]>([]);

  useEffect(() => {
    const currentKeys = new Set(items.map(keyFn));
    const prevItems = prevItemsRef.current;

    setGrace((prev) => {
      const now = Date.now();
      const next = new Map(prev);

      for (const [key, entry] of Array.from(next.entries())) {
        if (now - entry.removedAt >= GRACE_PERIOD_MS) {
          next.delete(key);
        }
      }

      for (const item of prevItems) {
        const key = keyFn(item);
        if (!currentKeys.has(key)) {
          next.set(key, { item, removedAt: now });
        }
      }

      return next;
    });

    prevItemsRef.current = items;
  }, [items, keyFn]);

  const displayItems = useMemo(() => {
    const merged = [...items];
    const seen = new Set(items.map(keyFn));
    const now = Date.now();

    for (const [key, entry] of Array.from(grace.entries())) {
      if (!seen.has(key) && now - entry.removedAt < GRACE_PERIOD_MS) {
        merged.push(entry.item);
      }
    }

    return merged;
  }, [items, grace, keyFn]);

  const isFading = useCallback(
    (item: T) => {
      const key = keyFn(item);
      return grace.has(key) && !items.some((row) => keyFn(row) === key);
    },
    [items, grace, keyFn]
  );

  return { displayItems, isFading, gracePeriodMs: GRACE_PERIOD_MS };
}
