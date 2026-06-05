import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { SelectUser } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { logSessionAnomaly } from "./sessionAudit";
import { AUTH_SESSION_TTL_MS } from "./sessionConfig";
// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/** Avoid writing lastSignedIn on every tRPC request (session still validated each time). */
const LAST_SIGNED_IN_THROTTLE_MS = 15 * 60 * 1000;

function shouldRefreshLastSignedIn(
  lastSignedIn: string | Date | null | undefined
): boolean {
  if (!lastSignedIn) return true;
  const last = new Date(lastSignedIn);
  if (Number.isNaN(last.getTime())) return true;
  return Date.now() - last.getTime() >= LAST_SIGNED_IN_THROTTLE_MS;
}

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? AUTH_SESSION_TTL_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(Math.floor(issuedAt / 1000))
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) return null;

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        return null;
      }

      return {
        openId,
        appId,
        name,
      };
    } catch (error) {
      return null;
    }
  }

  private async verifySessionDetailed(
    cookieValue: string | undefined | null
  ): Promise<
    | { session: { openId: string; appId: string; name: string; iat?: number } }
    | { session: null; reason: "missing" | "invalid" }
  > {
    if (!cookieValue) return { session: null, reason: "missing" };
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name, iat } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        return { session: null, reason: "invalid" };
      }

      return {
        session: {
          openId,
          appId,
          name,
          iat: typeof iat === "number" ? iat : undefined,
        },
      };
    } catch {
      return { session: null, reason: "invalid" };
    }
  }

  async authenticateRequest(req: Request): Promise<SelectUser> {
    // Regular authentication flow
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const verified = await this.verifySessionDetailed(sessionCookie);

    if (!verified.session) {
      logSessionAnomaly(req, verified.reason === "missing" ? "session_cookie_missing" : "session_invalid", {
        severity: verified.reason === "missing" ? "debug" : "warn",
        metadata: { reason: verified.reason },
      });
      throw ForbiddenError("Invalid session cookie");
    }

    const session = verified.session;
    if (ENV.appId && session.appId !== ENV.appId) {
      logSessionAnomaly(req, "session_appid_mismatch", {
        severity: "warn",
        metadata: { expectedAppId: ENV.appId, gotAppId: session.appId },
      });
      throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    const user = await db.getUserByOpenId(sessionUserId);

    if (!user) {
      logSessionAnomaly(req, "session_user_not_found", {
        severity: "warn",
        metadata: { openId: sessionUserId },
      });
      throw ForbiddenError("User not found");
    }

    // Invalidate sessions issued before explicit revocation boundary (AUTH2-C Slice 3B.3).
    if (user.sessionValidAfter && typeof session.iat === "number") {
      const validAfterSec = Math.floor(
        new Date(user.sessionValidAfter).getTime() / 1000
      );
      if (Number.isFinite(validAfterSec) && session.iat < validAfterSec) {
        logSessionAnomaly(req, "session_invalid", {
          severity: "warn",
          actorId: user.id,
          role: user.role,
          metadata: { reason: "session_issued_before_session_valid_after" },
        });
        throw ForbiddenError("Invalid session cookie");
      }
    }

    // Invalidate sessions issued before password changes (AUTH2-B safety).
    if (user.passwordChangedAt && typeof session.iat === "number") {
      const changedAtSec = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
      if (Number.isFinite(changedAtSec) && session.iat < changedAtSec) {
        logSessionAnomaly(req, "session_invalid", {
          severity: "warn",
          actorId: user.id,
          role: user.role,
          metadata: { reason: "session_issued_before_password_change" },
        });
        throw ForbiddenError("Invalid session cookie");
      }
    }

    if (shouldRefreshLastSignedIn(user.lastSignedIn)) {
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: signedInAt.toISOString(),
      });
    } else if (process.env.AUTH_DEBUG === "1") {
      console.info("[Auth] authenticateRequest: skipped lastSignedIn (throttled)");
    }

    return user;
  }
}

export const sdk = new SDKServer();
