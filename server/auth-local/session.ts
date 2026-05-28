import type { Request } from "express";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";
import { parseCookies } from "./httpHelpers";

export type VerifiedSession = NonNullable<Awaited<ReturnType<typeof sdk.verifySession>>>;

/**
 * Read session cookie and verify JWT (includes appId gate when configured).
 * Returns null when missing, invalid, or appId mismatch.
 */
export async function getVerifiedSessionFromRequest(
  req: Request
): Promise<VerifiedSession | null> {
  const cookies = parseCookies(req.headers.cookie);
  const session = await sdk.verifySession(cookies.get(COOKIE_NAME));
  if (!session) return null;
  if (ENV.appId && session.appId !== ENV.appId) return null;
  return session;
}
