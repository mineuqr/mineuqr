import { ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { setSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { createTrialSubscription } from "../create-trial-subscription";
import { notifyOwnerNewUser } from "../owner-email-notifications";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
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
            console.error("[OAuth] Failed to create trial subscription:", error);
          }
          // Send email notification to owner about new user
          try {
            await notifyOwnerNewUser({
              name: userInfo.name || null,
              email: userInfo.email ?? null,
              loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            });
          } catch (error) {
            console.error("[OAuth] Failed to send new user email notification:", error);
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
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
