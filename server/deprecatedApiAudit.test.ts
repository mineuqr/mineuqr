/**
 * ADMIN-SECURITY-CENTER PR-9 — deprecated_api_used emitter tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import { setAuditPersistFnForTests } from "./audit/auditEmitter";

const opsLogMock = vi.hoisted(() => vi.fn());

vi.mock("./_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

import {
  DEPRECATED_PROFILE_GOVERNANCE_APIS,
  getDeprecatedApiReplacement,
  logDeprecatedApiUsed,
} from "./deprecatedApiAudit";

const adminContext = {
  user: {
    id: 99,
    openId: "admin_99",
    role: "admin" as const,
  },
  correlationId: "corr-pr9-001",
  req: { headers: {} },
  res: { clearCookie: vi.fn() },
};

describe("deprecatedApiAudit PR-9", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuditPersistFnForTests(async () => ({ id: 1 }));
  });

  afterEach(() => {
    setAuditPersistFnForTests(async () => ({ id: 1 }));
  });

  it("maps all deprecated profile governance APIs to admin replacements", () => {
    expect(DEPRECATED_PROFILE_GOVERNANCE_APIS).toEqual({
      "profile.listAllUsers": "admin.listAllUsers",
      "profile.updateUserRole": "admin.updateUserRole",
      "profile.deleteUser": "admin.deleteUser",
    });
    expect(getDeprecatedApiReplacement("profile.deleteUser")).toBe("admin.deleteUser");
  });

  it("emits deprecated_api_used with SECURITY category and api metadata", async () => {
    const persisted: Array<Record<string, unknown>> = [];
    setAuditPersistFnForTests(async (event) => {
      persisted.push(event as Record<string, unknown>);
      return { id: 1 };
    });

    logDeprecatedApiUsed(adminContext as any, "profile.updateUserRole");

    expect(opsLogMock).toHaveBeenCalledTimes(1);
    const opsEvent = opsLogMock.mock.calls[0]![0];
    expect(opsEvent.type).toBe(OPS_EVENT.deprecated_api_used);
    expect(opsEvent.severity).toBe("info");
    expect(opsEvent.procedure).toBe("profile.updateUserRole");
    expect(opsEvent.metadata).toEqual({ api: "profile.updateUserRole" });

    expect(persisted).toHaveLength(1);
    expect(persisted[0]!.category).toBe("SECURITY");
    expect(persisted[0]!.eventType).toBe(OPS_EVENT.deprecated_api_used);
    expect(persisted[0]!.metadata).toEqual({ api: "profile.updateUserRole" });
  });

  it("does not throw when audit persistence fails", async () => {
    setAuditPersistFnForTests(async () => {
      throw new Error("audit_events unavailable");
    });

    expect(() =>
      logDeprecatedApiUsed(adminContext as any, "profile.listAllUsers")
    ).not.toThrow();
    expect(opsLogMock).toHaveBeenCalledTimes(1);
  });
});
