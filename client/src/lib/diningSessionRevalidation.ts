/**
 * CUSTOMER-SESSION-LIFECYCLE-1C — event-driven dining session revalidation helpers.
 */

export type DiningSessionRecoveryMode = "initial" | "revalidate";

export function isDiningSessionRecoveryContextReady(
  slug: string,
  tableNumber: number,
  restaurantId?: number
): boolean {
  return Boolean(slug && tableNumber > 0 && restaurantId);
}

export function shouldRevalidateOnVisibilityChange(
  visibilityState: DocumentVisibilityState
): boolean {
  return visibilityState === "visible";
}

/** Bind focus / visibility / pageshow revalidation (no polling). */
export function attachDiningSessionRevalidationListeners(
  onRevalidate: () => void
): () => void {
  const handleFocus = () => {
    onRevalidate();
  };

  const handleVisibilityChange = () => {
    if (shouldRevalidateOnVisibilityChange(document.visibilityState)) {
      onRevalidate();
    }
  };

  const handlePageShow = () => {
    onRevalidate();
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pageshow", handlePageShow);

  return () => {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pageshow", handlePageShow);
  };
}
