/**
 * ADMIN-SECURITY-CENTER PR-6 — admin audit read + security health APIs.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertAdminAccess } from "../_core/assertAdminAccess";
import { protectedProcedure, router } from "../_core/trpc";
import {
  AUDIT_MAX_RANGE_DAYS,
  clampAuditListLimit,
  resolveAuditDateRange,
} from "./auditQueryLimits";
import {
  getAuditEventById,
  getAuditEventStats,
  listAuditEvents,
} from "./auditReadRepository";
import { getAdminSecurityHealth } from "./securityHealthApi";

const AUDIT_CATEGORIES = ["ACCESS", "USER", "SUBSCRIPTION", "COMMERCIAL", "SECURITY"] as const;
const AUDIT_SEVERITIES = ["info", "warn", "error"] as const;

const listAuditEventsInput = z.object({
  cursor: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  eventType: z.string().max(64).optional(),
  category: z.enum(AUDIT_CATEGORIES).optional(),
  severity: z.enum(AUDIT_SEVERITIES).optional(),
  actorId: z.number().int().positive().optional(),
  targetType: z.string().max(32).optional(),
  targetId: z.number().int().positive().optional(),
  correlationId: z.string().max(64).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const getAuditEventStatsInput = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const adminAuditRouter = router({
  listAuditEvents: protectedProcedure
    .input(listAuditEventsInput)
    .query(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.listAuditEvents");

      const dateRange = resolveAuditDateRange({
        from: input.from,
        to: input.to,
        defaultRangeDays: input.from || input.to ? undefined : AUDIT_MAX_RANGE_DAYS,
      });

      return listAuditEvents({
        filter: {
          eventType: input.eventType,
          category: input.category,
          severity: input.severity,
          actorId: input.actorId,
          targetType: input.targetType,
          targetId: input.targetId,
          correlationId: input.correlationId,
          from: dateRange.from,
          to: dateRange.to,
        },
        limit: clampAuditListLimit(input.limit),
        cursor: input.cursor,
      });
    }),

  getAuditEvent: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.getAuditEvent");

      const event = await getAuditEventById(input.id);
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audit event not found" });
      }
      return event;
    }),

  getAuditEventStats: protectedProcedure
    .input(getAuditEventStatsInput)
    .query(async ({ input, ctx }) => {
      assertAdminAccess(ctx, "admin.getAuditEventStats");

      const { from, to } = resolveAuditDateRange({
        from: input.from,
        to: input.to,
      });

      return getAuditEventStats({ from, to });
    }),

  getSecurityHealth: protectedProcedure.query(async ({ ctx }) => {
    assertAdminAccess(ctx, "admin.getSecurityHealth");
    return getAdminSecurityHealth();
  }),
});
