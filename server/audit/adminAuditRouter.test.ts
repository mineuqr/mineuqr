/**
 * ADMIN-SECURITY-CENTER PR-6 — admin audit read API tests.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";
import type { SelectAuditEvent } from "../../drizzle/schema";

vi.mock("./auditReadRepository", () => ({
  listAuditEvents: vi.fn(),
  getAuditEventById: vi.fn(),
  getAuditEventStats: vi.fn(),
}));

vi.mock("./securityHealthApi", () => ({
  getAdminSecurityHealth: vi.fn(),
}));

import {
  getAuditEventById,
  getAuditEventStats,
  listAuditEvents,
} from "./auditReadRepository";
import { getAdminSecurityHealth } from "./securityHealthApi";
import { appRouter } from "../routers";

const SAMPLE_EVENT: SelectAuditEvent = {
  id: 101,
  eventType: "user_role_changed",
  eventVersion: 1,
  category: "USER",
  severity: "info",
  occurredAt: "2026-06-11T10:00:00.000Z",
  actorId: 99,
  actorRole: "admin",
  targetType: "user",
  targetId: 5,
  procedure: "admin.updateUserRole",
  correlationId: "corr-1",
  ip: null,
  before: { role: "user" },
  after: { role: "admin" },
  metadata: { targetUserId: 5 },
};

function adminContext(): TrpcContext {
  return {
    user: {
      id: 99,
      openId: "admin_99",
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
      accountClassification: "INTERNAL",
      loginMethod: "email",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      passwordHash: null,
    },
    correlationId: "corr-test",
    req: { headers: { origin: "http://localhost:3000" } },
    res: { clearCookie: vi.fn() },
  } as TrpcContext;
}

function userContext(): TrpcContext {
  return {
    user: {
      id: 5,
      openId: "user_5",
      name: "User",
      email: "user@test.com",
      role: "user",
      accountClassification: "COMMERCIAL",
      loginMethod: "email",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      passwordHash: null,
    },
    req: { headers: { origin: "http://localhost:3000" } },
    res: { clearCookie: vi.fn() },
  } as TrpcContext;
}

describe("adminAuditRouter PR-6", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listAuditEvents as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [SAMPLE_EVENT],
      nextCursor: null,
    });
    (getAuditEventById as ReturnType<typeof vi.fn>).mockResolvedValue(SAMPLE_EVENT);
    (getAuditEventStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      total: 10,
      today: 2,
      byCategory: { USER: 8, SECURITY: 2 },
      bySeverity: { info: 9, warn: 1 },
      range: {
        from: "2026-06-04T00:00:00.000Z",
        to: "2026-06-11T00:00:00.000Z",
      },
    });
    (getAdminSecurityHealth as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "healthy",
      ownerOpenIdConfigured: true,
      ownerOpenIdPrefix: "platform",
      platformUserResolved: true,
      platformUserId: 1,
      protectionActive: true,
      environment: "development",
      auditPersistence: { databaseAvailable: true, auditTableReadable: true },
      warnings: [],
    });
  });

  describe("listAuditEvents", () => {
    it("returns paginated items newest first via repository", async () => {
      const caller = appRouter.createCaller(adminContext());
      const result = await caller.admin.listAuditEvents({
        limit: 25,
        category: "USER",
        actorId: 99,
      });

      expect(result.items).toHaveLength(1);
      expect(listAuditEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 25,
          filter: expect.objectContaining({
            category: "USER",
            actorId: 99,
          }),
        })
      );
    });

    it("applies cursor and correlation filters", async () => {
      const caller = appRouter.createCaller(adminContext());
      await caller.admin.listAuditEvents({
        cursor: 200,
        correlationId: "corr-1",
        eventType: "user_role_changed",
      });

      expect(listAuditEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: 200,
          filter: expect.objectContaining({
            correlationId: "corr-1",
            eventType: "user_role_changed",
          }),
        })
      );
    });
  });

  describe("getAuditEvent", () => {
    it("returns event with before/after snapshots", async () => {
      const caller = appRouter.createCaller(adminContext());
      const event = await caller.admin.getAuditEvent({ id: 101 });

      expect(event.before).toEqual({ role: "user" });
      expect(event.after).toEqual({ role: "admin" });
      expect(event.correlationId).toBe("corr-1");
    });

    it("throws NOT_FOUND for missing event", async () => {
      (getAuditEventById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const caller = appRouter.createCaller(adminContext());

      await expect(caller.admin.getAuditEvent({ id: 9999 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      } satisfies Partial<TRPCError>);
    });
  });

  describe("getAuditEventStats", () => {
    it("returns aggregation buckets", async () => {
      const caller = appRouter.createCaller(adminContext());
      const stats = await caller.admin.getAuditEventStats({
        from: "2026-06-04T00:00:00.000Z",
        to: "2026-06-11T00:00:00.000Z",
      });

      expect(stats.total).toBe(10);
      expect(stats.today).toBe(2);
      expect(stats.byCategory.USER).toBe(8);
      expect(stats.bySeverity.info).toBe(9);
    });
  });

  describe("getSecurityHealth", () => {
    it("returns healthy state", async () => {
      const caller = appRouter.createCaller(adminContext());
      const health = await caller.admin.getSecurityHealth();

      expect(health.status).toBe("healthy");
      expect(health.protectionActive).toBe(true);
    });

    it("returns degraded/misconfigured states from API layer", async () => {
      (getAdminSecurityHealth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: "warning",
        ownerOpenIdConfigured: true,
        ownerOpenIdPrefix: "platform",
        platformUserResolved: false,
        platformUserId: null,
        protectionActive: false,
        environment: "development",
        auditPersistence: { databaseAvailable: true, auditTableReadable: true },
        warnings: [{ code: "PLATFORM_USER_NOT_RESOLVED", severity: "warning", message: "x" }],
      });

      const caller = appRouter.createCaller(adminContext());
      const health = await caller.admin.getSecurityHealth();
      expect(health.status).toBe("warning");
    });

    it("returns critical misconfigured state", async () => {
      (getAdminSecurityHealth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: "critical",
        ownerOpenIdConfigured: false,
        ownerOpenIdPrefix: null,
        platformUserResolved: false,
        platformUserId: null,
        protectionActive: false,
        environment: "production",
        auditPersistence: { databaseAvailable: false, auditTableReadable: false },
        warnings: [{ code: "OWNER_OPEN_ID_MISSING", severity: "critical", message: "x" }],
      });

      const caller = appRouter.createCaller(adminContext());
      const health = await caller.admin.getSecurityHealth();
      expect(health.status).toBe("critical");
    });
  });

  describe("authorization", () => {
    it("denies non-admin for listAuditEvents", async () => {
      const caller = appRouter.createCaller(userContext());
      await expect(caller.admin.listAuditEvents({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      } satisfies Partial<TRPCError>);
      expect(listAuditEvents).not.toHaveBeenCalled();
    });

    it("denies non-admin for getSecurityHealth", async () => {
      const caller = appRouter.createCaller(userContext());
      await expect(caller.admin.getSecurityHealth()).rejects.toMatchObject({
        code: "FORBIDDEN",
      } satisfies Partial<TRPCError>);
      expect(getAdminSecurityHealth).not.toHaveBeenCalled();
    });
  });
});
