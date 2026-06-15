import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getActivationTraceSnapshot,
  isActivationTraceEnabled,
  recordActivationTrace,
  resetActivationTrace,
} from "./activationTrace";

describe("activationTrace ACTIVATION-TRACE-1", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetActivationTrace();
  });

  it("isActivationTraceEnabled when activationTrace query param present", () => {
    vi.stubGlobal("window", { location: { search: "?activationTrace=1" } });
    expect(isActivationTraceEnabled()).toBe(true);
  });

  it("records stages and ui enrollment outcome", () => {
    recordActivationTrace("onclick_fired");
    recordActivationTrace("activate_alerts_started");
    recordActivationTrace("ui_enrollment_complete", {
      enrollmentComplete: true,
      pushSubscribed: true,
      permission: "granted",
      pushSubscriptionState: "SUBSCRIBED",
    });

    const snap = getActivationTraceSnapshot();
    expect(snap.stages).toEqual([
      "onclick_fired",
      "activate_alerts_started",
      "ui_enrollment_complete",
    ]);
    expect(snap.enrollmentComplete).toBe(true);
    expect(snap.pushSubscribed).toBe(true);
    expect(snap.permission).toBe("granted");
  });
});
