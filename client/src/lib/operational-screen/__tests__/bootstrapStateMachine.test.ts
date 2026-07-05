import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  INITIAL_PHASE,
  canTransition,
  transition,
} from "../bootstrapStateMachine";
import type { BootstrapPhase } from "../runtimeTypes";

const ALL_PHASES: BootstrapPhase[] = [
  "loading",
  "validating",
  "context_ready",
  "heartbeat_active",
  "running",
  "degraded",
  "revoked",
  "blocked",
  "pairing_redirect",
];

describe("RUNTIME-BOOTSTRAP-CONTRACT-1 state machine", () => {
  it("defines transitions for every phase (no missing state)", () => {
    for (const phase of ALL_PHASES) {
      expect(ALLOWED_TRANSITIONS[phase]).toBeDefined();
    }
  });

  it("walks the canonical happy path explicitly", () => {
    let phase = INITIAL_PHASE;
    expect(phase).toBe("loading");
    phase = transition(phase, { type: "CREDENTIALS_FOUND" });
    expect(phase).toBe("validating");
    phase = transition(phase, { type: "STATUS_RECEIVED" });
    expect(phase).toBe("context_ready");
    phase = transition(phase, { type: "CONTEXT_ASSEMBLED" });
    expect(phase).toBe("heartbeat_active");
    phase = transition(phase, { type: "HEARTBEAT_STARTED" });
    expect(phase).toBe("running");
  });

  it("routes loading → pairing_redirect when credentials are missing", () => {
    expect(transition("loading", { type: "CREDENTIALS_MISSING" })).toBe("pairing_redirect");
  });

  it("transitions running → degraded → running on network failure/recovery", () => {
    const degraded = transition("running", { type: "NETWORK_FAILURE" });
    expect(degraded).toBe("degraded");
    expect(transition(degraded, { type: "NETWORK_RECOVERED" })).toBe("running");
  });

  it("transitions running → blocked for unsupported roles", () => {
    expect(transition("running", { type: "RUN_BLOCKED" })).toBe("blocked");
  });

  it("keeps heartbeat-capable phases before revoke terminal", () => {
    expect(transition("blocked", { type: "AUTH_REVOKED" })).toBe("revoked");
    expect(transition("revoked", { type: "PAIRING_REDIRECTED" })).toBe("pairing_redirect");
  });

  it("rejects implicit jumps (no illegal transition)", () => {
    // Cannot jump loading → running directly.
    expect(canTransition("loading", "running")).toBe(false);
    expect(transition("loading", { type: "HEARTBEAT_STARTED" })).toBe("loading");
    // Cannot skip context assembly.
    expect(transition("validating", { type: "HEARTBEAT_STARTED" })).toBe("validating");
  });

  it("AUTH_REVOKED is reachable from any active phase", () => {
    for (const phase of ["validating", "context_ready", "heartbeat_active", "running", "blocked", "degraded"] as BootstrapPhase[]) {
      expect(transition(phase, { type: "AUTH_REVOKED" })).toBe("revoked");
    }
  });
});
