import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { assertEmailVerificationSatisfied } from "./emailVerificationPolicy";
import { opsLog } from "./opsLog";
import { trackSuspiciousActivity } from "./suspiciousActivity";
import { OPS_EVENT } from "./opsTaxonomy";
import { trackTrpcProcedurePressure } from "./healthSignals";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;

const OPS_TRPC_DEBUG = process.env.OPS_TRPC_DEBUG === "1";

const runtimeDiagnostics = t.middleware(async (opts) => {
  try {
    const result = await opts.next();

    // Operational health visibility (MON-1R.2): aggregated polling pressure detection.
    // This emits only when thresholds are crossed and is cooldowned.
    trackTrpcProcedurePressure({
      procedure: opts.path ?? "unknown",
      procedureType: opts.type ?? "unknown",
      correlationId: opts.ctx?.correlationId ?? undefined,
    });

    return result;
  } catch (cause) {
    const ctx = opts.ctx;
    const correlationId = ctx?.correlationId ?? undefined;
    const actorId = ctx?.user?.id ?? null;
    const role = ctx?.user?.role ?? null;
    const procedure = opts.path ?? "unknown";
    const kind = opts.type ?? "unknown";

    const isTrpc = cause instanceof TRPCError;
    const code = isTrpc ? cause.code : "INTERNAL_SERVER_ERROR";

    // Classify: unexpected/internal failures are always logged as errors.
    // Expected operational failures can be noisy; log them only when OPS_TRPC_DEBUG=1.
    const isUnexpected = !isTrpc || code === "INTERNAL_SERVER_ERROR";

    if (isUnexpected || OPS_TRPC_DEBUG) {
      opsLog({
        type: isUnexpected ? OPS_EVENT.trpc_runtime_failure : OPS_EVENT.trpc_error,
        category: "RUNTIME",
        severity: isUnexpected ? "error" : "warn",
        ts: new Date().toISOString(),
        correlationId,
        actorId,
        role,
        procedure,
        // Keep action reserved for semantic operations; use metadata for query/mutation kind.
        metadata: {
          procedure,
          procedureType: kind,
          code,
          // Keep message for debugging; do not include stack unless debug is enabled.
          message:
            isTrpc && typeof cause.message === "string" ? cause.message : "unknown",
          stack:
            OPS_TRPC_DEBUG && cause instanceof Error ? cause.stack : undefined,
          name:
            OPS_TRPC_DEBUG && cause instanceof Error ? cause.name : undefined,
        },
      });
    }

    if (isUnexpected) {
      trackSuspiciousActivity({
        signal: "trpc_runtime_failure",
        category: "RUNTIME",
        actorId,
        role,
        correlationId,
        procedure,
        metadata: { procedure, procedureType: kind, code },
      });
    }

    throw cause;
  }
});

const baseProcedure = t.procedure.use(runtimeDiagnostics);

export const publicProcedure = baseProcedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = baseProcedure.use(requireUser);

const requireVerifiedEmail = t.middleware(async opts => {
  const { ctx, next } = opts;
  assertEmailVerificationSatisfied(ctx.user!);
  return next({
    ctx: {
      ...ctx,
      user: ctx.user!,
    },
  });
});

/** Session + verified email (when AUTH_REQUIRE_VERIFIED_EMAIL=1). Not wired to routers until Slice 2. */
export const verifiedProcedure = protectedProcedure.use(requireVerifiedEmail);

export const adminProcedure = baseProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
