/**
 * ORDER-INTERACTION-PERFORMANCE-1 — deterministic structural sharing.
 *
 * Returns a value that reuses as many references from `previous` as possible
 * while being structurally equal to `next`. When the two are structurally
 * identical, `previous` is returned unchanged (referential identity preserved).
 *
 * This is a pure, deterministic, side-effect-free transformation. It holds no
 * state and is not a cache — it only reconciles two concrete values.
 */
export function structuralShare<T>(previous: T, next: T): T {
  if (Object.is(previous, next)) return previous;

  if (
    previous === null ||
    next === null ||
    typeof previous !== "object" ||
    typeof next !== "object"
  ) {
    return next;
  }

  const prevIsArray = Array.isArray(previous);
  const nextIsArray = Array.isArray(next);
  if (prevIsArray !== nextIsArray) return next;

  if (prevIsArray && nextIsArray) {
    const prevArr = previous as readonly unknown[];
    const nextArr = next as readonly unknown[];
    let changed = prevArr.length !== nextArr.length;
    const result = nextArr.map((item, index) => {
      if (index >= prevArr.length) {
        changed = true;
        return item;
      }
      const shared = structuralShare(prevArr[index], item);
      if (!Object.is(shared, prevArr[index])) changed = true;
      return shared;
    });
    return (changed ? result : previous) as T;
  }

  const prevObj = previous as Record<string, unknown>;
  const nextObj = next as Record<string, unknown>;
  const nextKeys = Object.keys(nextObj);
  const prevKeys = Object.keys(prevObj);

  let changed = nextKeys.length !== prevKeys.length;
  const result: Record<string, unknown> = {};
  for (const key of nextKeys) {
    const shared = structuralShare(prevObj[key], nextObj[key]);
    result[key] = shared;
    if (!Object.is(shared, prevObj[key])) changed = true;
  }

  return (changed ? result : previous) as T;
}
