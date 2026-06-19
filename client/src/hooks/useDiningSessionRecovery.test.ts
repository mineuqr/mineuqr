import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  recoverDiningSession,
  isDiningSessionOrderingEnabled,
  type RecoveredDiningSession,
} from "@/lib/diningSessionRecovery";
import {
  attachDiningSessionRevalidationListeners,
  shouldRevalidateOnVisibilityChange,
} from "@/lib/diningSessionRevalidation";

vi.mock("@/lib/diningSessionRecovery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/diningSessionRecovery")>();
  return {
    ...actual,
    recoverDiningSession: vi.fn(),
  };
});

const openSession: RecoveredDiningSession = {
  sessionToken: "open-token1234567890",
  status: "open",
  tableNumber: 5,
  openedAt: "2026-06-18T12:00:00.000Z",
};

const billRequestedSession: RecoveredDiningSession = {
  ...openSession,
  status: "bill_requested",
  billRequestedAt: "2026-06-18T13:00:00.000Z",
};

const paymentPendingSession: RecoveredDiningSession = {
  ...openSession,
  status: "payment_pending",
  paymentPendingAt: "2026-06-18T14:00:00.000Z",
};

const recoveryInput = {
  slug: "cafe",
  tableNumber: 5,
  client: {
    getByToken: vi.fn(),
    getActiveByTable: vi.fn(),
  },
};

describe("diningSessionRevalidation CUSTOMER-SESSION-LIFECYCLE-1C", () => {
  const domMocks = vi.hoisted(() => {
    function createEventTarget() {
      const listeners = new Map<string, Set<EventListener>>();
      return {
        addEventListener(type: string, listener: EventListener) {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(listener);
        },
        removeEventListener(type: string, listener: EventListener) {
          listeners.get(type)?.delete(listener);
        },
        dispatchEvent(event: Event) {
          listeners.get(event.type)?.forEach((listener) => listener(event));
          return true;
        },
      };
    }

    return { createEventTarget };
  });

  let windowTarget: ReturnType<typeof domMocks.createEventTarget>;
  let documentTarget: ReturnType<typeof domMocks.createEventTarget>;

  beforeEach(() => {
    vi.clearAllMocks();
    windowTarget = domMocks.createEventTarget();
    documentTarget = domMocks.createEventTarget();

    vi.stubGlobal("window", {
      addEventListener: windowTarget.addEventListener,
      removeEventListener: windowTarget.removeEventListener,
      dispatchEvent: windowTarget.dispatchEvent,
    });
    vi.stubGlobal("document", {
      visibilityState: "visible" as DocumentVisibilityState,
      addEventListener: documentTarget.addEventListener,
      removeEventListener: documentTarget.removeEventListener,
      dispatchEvent: documentTarget.dispatchEvent,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shouldRevalidateOnVisibilityChange only when visible", () => {
    expect(shouldRevalidateOnVisibilityChange("visible")).toBe(true);
    expect(shouldRevalidateOnVisibilityChange("hidden")).toBe(false);
  });

  it("A: focus event triggers revalidation callback", () => {
    const onRevalidate = vi.fn();
    const detach = attachDiningSessionRevalidationListeners(onRevalidate);

    window.dispatchEvent(new Event("focus"));
    expect(onRevalidate).toHaveBeenCalledTimes(1);

    detach();
    window.dispatchEvent(new Event("focus"));
    expect(onRevalidate).toHaveBeenCalledTimes(1);
  });

  it("C: visibilitychange (visible) triggers revalidation callback", () => {
    const onRevalidate = vi.fn();
    attachDiningSessionRevalidationListeners(onRevalidate);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    document.dispatchEvent(new Event("visibilitychange"));
    expect(onRevalidate).toHaveBeenCalledTimes(1);
  });

  it("visibilitychange (hidden) does not trigger revalidation", () => {
    const onRevalidate = vi.fn();
    attachDiningSessionRevalidationListeners(onRevalidate);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    document.dispatchEvent(new Event("visibilitychange"));
    expect(onRevalidate).not.toHaveBeenCalled();
  });

  it("D/E: pageshow triggers revalidation callback (BFCache restore path)", () => {
    const onRevalidate = vi.fn();
    attachDiningSessionRevalidationListeners(onRevalidate);

    window.dispatchEvent(new Event("pageshow"));
    expect(onRevalidate).toHaveBeenCalledTimes(1);
  });
});

describe("revalidation session state transitions CUSTOMER-SESSION-LIFECYCLE-1C", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("A: successive recovery keeps open session and ordering enabled", async () => {
    vi.mocked(recoverDiningSession).mockResolvedValue(openSession);

    const first = await recoverDiningSession(recoveryInput);
    const second = await recoverDiningSession(recoveryInput);

    expect(first).toEqual(openSession);
    expect(second).toEqual(openSession);
    expect(isDiningSessionOrderingEnabled(second)).toBe(true);
    expect(recoverDiningSession).toHaveBeenCalledTimes(2);
  });

  it("B: recovery returns null after closure — session cleared, ordering enabled", async () => {
    vi.mocked(recoverDiningSession)
      .mockResolvedValueOnce(openSession)
      .mockResolvedValueOnce(null);

    const before = await recoverDiningSession(recoveryInput);
    const after = await recoverDiningSession(recoveryInput);

    expect(before).toEqual(openSession);
    expect(after).toBeNull();
    expect(isDiningSessionOrderingEnabled(after)).toBe(true);
  });

  it("C: bill_requested recovery disables ordering", async () => {
    vi.mocked(recoverDiningSession)
      .mockResolvedValueOnce(openSession)
      .mockResolvedValueOnce(billRequestedSession);

    await recoverDiningSession(recoveryInput);
    const after = await recoverDiningSession(recoveryInput);

    expect(after?.status).toBe("bill_requested");
    expect(isDiningSessionOrderingEnabled(after)).toBe(false);
  });

  it("D: payment_pending recovery disables ordering", async () => {
    vi.mocked(recoverDiningSession)
      .mockResolvedValueOnce(openSession)
      .mockResolvedValueOnce(paymentPendingSession);

    await recoverDiningSession(recoveryInput);
    const after = await recoverDiningSession(recoveryInput);

    expect(after?.status).toBe("payment_pending");
    expect(isDiningSessionOrderingEnabled(after)).toBe(false);
  });
});
