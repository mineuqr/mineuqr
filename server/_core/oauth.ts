import { ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { setSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { createTrialSubscription } from "../create-trial-subscription";
import { notifyOwnerNewUser } from "../owner-email-notifications";
import { opsLog } from "./opsLog";
import { OPS_EVENT } from "./opsTaxonomy";
import { getCorrelationId } from "./requestContext";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const correlationId = getCorrelationId(req);
    const route = req.path;
    const method = req.method;

    if (!code || !state) {
      opsLog({
        type: OPS_EVENT.oauth_callback_missing_params,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        metadata: {
          missingCode: !code,
          missingState: !state,
        },
      });
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        opsLog({
          type: OPS_EVENT.oauth_userinfo_missing_openid,
          category: "AUTH",
          severity: "warn",
          ts: new Date().toISOString(),
          correlationId,
          route,
          method,
          metadata: {
            provider: "manus",
          },
        });
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const existingUser = await db.getUserByOpenId(userInfo.openId);
      
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date().toISOString(),
      });
      
      // Create trial subscription for new users
      if (!existingUser) {
        const user = await db.getUserByOpenId(userInfo.openId);
        if (user) {
          try {
            await createTrialSubscription(user.id);
          } catch (error) {
            opsLog({
              type: OPS_EVENT.oauth_trial_subscription_failed,
              category: "AUTH",
              severity: "warn",
              ts: new Date().toISOString(),
              correlationId,
              route,
              method,
              actorId: user.id,
              metadata: {
                provider: "manus",
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
          // Send email notification to owner about new user
          try {
            await notifyOwnerNewUser({
              name: userInfo.name || null,
              email: userInfo.email ?? null,
              loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            });
          } catch (error) {
            opsLog({
              type: OPS_EVENT.oauth_owner_notification_failed,
              category: "AUTH",
              severity: "warn",
              ts: new Date().toISOString(),
              correlationId,
              route,
              method,
              actorId: user.id,
              metadata: {
                provider: "manus",
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      setSessionCookie(res, req, sessionToken, ONE_YEAR_MS);
      if (process.env.AUTH_DEBUG === "1") {
        console.info("[Auth] OAuth callback: session cookie set");
      }

      res.redirect(302, "/");
    } catch (error) {
      opsLog({
        type: OPS_EVENT.oauth_callback_failed,
        category: "AUTH",
        severity: "error",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        metadata: {
          provider: "manus",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
