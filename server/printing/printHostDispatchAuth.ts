/**
 * THERMAL-PRINTING-13H.3 — Print Host dispatch bridge authentication.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import type { TrpcContext } from "../_core/context";
import { ENV } from "../_core/env";

export const PRINT_HOST_API_KEY_HEADER = "x-print-host-api-key";

function hashApiKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqualApiKey(provided: string, expected: string): boolean {
  const providedHash = hashApiKey(provided);
  const expectedHash = hashApiKey(expected);
  const providedBuffer = Buffer.from(providedHash, "utf8");
  const expectedBuffer = Buffer.from(expectedHash, "utf8");
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function readPrintHostApiKeyFromRequest(req: Request): string | undefined {
  const header = req.headers[PRINT_HOST_API_KEY_HEADER];
  if (typeof header === "string" && header.trim().length > 0) {
    return header.trim();
  }
  if (Array.isArray(header) && typeof header[0] === "string" && header[0].trim().length > 0) {
    return header[0].trim();
  }
  return undefined;
}

export function assertValidPrintHostApiKey(input: {
  providedKey: string | undefined;
  expectedKey: string;
  correlationId?: string;
}): void {
  if (!input.expectedKey) {
    if (ENV.isProduction) {
      opsLog({
        type: OPS_EVENT.dispatch_auth_rejected,
        category: "ORDER",
        severity: "error",
        ts: new Date().toISOString(),
        correlationId: input.correlationId,
        metadata: { reason: "server_misconfigured" },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Dispatch bridge is not configured",
      });
    }
    return;
  }

  if (!input.providedKey || !safeEqualApiKey(input.providedKey, input.expectedKey)) {
    opsLog({
      type: OPS_EVENT.dispatch_auth_rejected,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      correlationId: input.correlationId,
      metadata: {
        reason: input.providedKey ? "invalid_api_key" : "missing_api_key",
      },
    });
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid dispatch credentials",
    });
  }
}

const dispatchAuthTrpc = initTRPC.context<TrpcContext>().create();

export function createPrintHostApiKeyProcedure(expectedApiKey: string) {
  return dispatchAuthTrpc.procedure.use(({ ctx, next }) => {
    assertValidPrintHostApiKey({
      providedKey: readPrintHostApiKeyFromRequest(ctx.req),
      expectedKey: expectedApiKey,
      correlationId: ctx.correlationId,
    });
    return next();
  });
}
