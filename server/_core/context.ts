import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { SelectUser } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getCorrelationId } from "./requestContext";
import { clearSessionCookie } from "./cookies";
import { HttpError } from "@shared/_core/errors";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: SelectUser | null;
  correlationId?: string;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: SelectUser | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // If session cookie is invalid, clear it to avoid “ghost session” loops.
    // Only clear on the explicit invalid-cookie error to avoid logging out users
    // during transient dependency issues.
    if (error instanceof HttpError && error.statusCode === 403 && error.message === "Invalid session cookie") {
      clearSessionCookie(opts.res, opts.req);
    }
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    correlationId: getCorrelationId(opts.req),
  };
}
