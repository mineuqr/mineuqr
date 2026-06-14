/** CUSTOMER-UX-2 — one-shot flag after order submit for unified welcome hero. */

const PREFIX = "mineuqr:order-welcome:";

export function markOrderWelcomeReceived(trackingToken: string): void {
  if (!trackingToken) return;
  try {
    sessionStorage.setItem(`${PREFIX}${trackingToken}`, "1");
  } catch {
    /* private mode / quota */
  }
}

/** Returns true once per submit session, then clears the flag. */
export function consumeOrderWelcomeReceived(trackingToken: string): boolean {
  if (!trackingToken) return false;
  try {
    const key = `${PREFIX}${trackingToken}`;
    const value = sessionStorage.getItem(key);
    if (value !== "1") return false;
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** For tests. */
export function resetOrderWelcomeForTests(): void {
  if (typeof sessionStorage === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => sessionStorage.removeItem(key));
}
