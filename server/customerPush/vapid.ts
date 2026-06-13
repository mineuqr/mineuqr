/**
 * BACKGROUND-NOTIFICATIONS-1A — VAPID configuration for customer Web Push.
 */

import webpush from "web-push";
import { ENV } from "../_core/env";

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function getVapidConfig(): VapidConfig | null {
  const publicKey = ENV.vapidPublicKey.trim();
  const privateKey = ENV.vapidPrivateKey.trim();
  const subject = ENV.vapidSubject.trim();
  if (!publicKey || !privateKey || !subject) {
    return null;
  }
  return { publicKey, privateKey, subject };
}

export function isCustomerPushConfigured(): boolean {
  return getVapidConfig() !== null;
}

let vapidApplied = false;

export function ensureWebPushVapidConfigured(): boolean {
  const config = getVapidConfig();
  if (!config) return false;
  if (!vapidApplied) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    vapidApplied = true;
  }
  return true;
}

/** Startup validation — warn in production, never crash. */
export function validateCustomerPushAtStartup(): void {
  const configured = isCustomerPushConfigured();
  if (configured) {
    ensureWebPushVapidConfigured();
    console.info("[CustomerPush] VAPID keys configured — Web Push enabled");
    return;
  }
  const msg =
    "[CustomerPush] VAPID keys missing — customer Web Push disabled (set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)";
  if (ENV.isProduction) {
    console.warn(msg);
  } else {
    console.info(msg);
  }
}
