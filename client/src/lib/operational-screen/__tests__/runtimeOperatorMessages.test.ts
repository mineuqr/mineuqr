import { describe, expect, it } from "vitest";
import { toOperatorRuntimeMessage } from "../runtimeOperatorMessages";

describe("runtimeOperatorMessages", () => {
  it("maps database_unavailable without exposing internal code", () => {
    const message = toOperatorRuntimeMessage(
      { code: "runtime_error", message: "database_unavailable" },
      "en"
    );
    expect(message).toContain("temporarily unavailable");
    expect(message).not.toContain("database_unavailable");
  });

  it("maps heartbeat failures to operator language", () => {
    const message = toOperatorRuntimeMessage(
      { code: "runtime_error", message: "heartbeat_failed" },
      "en"
    );
    expect(message).toContain("Heartbeat");
    expect(message).not.toContain("heartbeat_failed");
  });

  it("maps status_unavailable", () => {
    const message = toOperatorRuntimeMessage(
      { code: "runtime_error", message: "status_unavailable" },
      "en"
    );
    expect(message).toContain("temporarily unavailable");
  });

  it("falls back to generic message for unknown internal errors", () => {
    const message = toOperatorRuntimeMessage(
      { code: "runtime_error", message: "TRPCClientError: Something broke at line 42" },
      "en"
    );
    expect(message).toContain("connection");
    expect(message).not.toContain("line 42");
    expect(message).not.toContain("TRPC");
  });
});
