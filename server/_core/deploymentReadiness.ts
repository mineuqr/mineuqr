/**
 * AUTH2-D.6 — Startup deployment-boundary validation (additive, low-noise).
 * Does not change request-time auth behavior.
 */

import { shouldTrustProxy } from "./authSecurity";
import { ENV } from "./env";

export type DeploymentAuthReadinessReport = {
  environment: "production" | "development";
  trustProxy: boolean;
  appIdConfigured: boolean;
  oauthConfigured: boolean;
  publicAppUrlConfigured: boolean;
  notes: string[];
};

export function assessDeploymentAuthReadiness(): DeploymentAuthReadinessReport {
  const notes: string[] = [];
  const trustProxy = shouldTrustProxy();
  const publicAppUrlConfigured = Boolean(process.env.PUBLIC_APP_URL?.trim());

  const explicitTrustProxy =
    process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true";

  if (ENV.isProduction) {
    if (!trustProxy) {
      notes.push(
        "Trust proxy disabled: Express may see http:// and set non-secure session cookies behind TLS termination."
      );
    } else if (!explicitTrustProxy) {
      notes.push(
        "Production enables trust proxy by default; ensure x-forwarded-proto=https reaches the app behind TLS termination."
      );
    }
    if (!ENV.oAuthServerUrl) {
      notes.push("OAUTH_SERVER_URL is empty: Manus OAuth login will not work.");
    }
    if (!publicAppUrlConfigured) {
      notes.push(
        "PUBLIC_APP_URL unset: password-reset / verify email links use request Origin or Host (ensure proxy sets protocol correctly)."
      );
    }
    if (process.env.CSRF_ORIGIN_ENFORCE !== "1") {
      notes.push(
        "CSRF_ORIGIN_ENFORCE is not 1: sensitive auth POSTs log origin issues but are not blocked (expected default)."
      );
    }
  } else {
    notes.push(
      "Development: session cookies use SameSite=lax, secure=false on local HTTP hosts."
    );
    if (trustProxy) {
      notes.push("TRUST_PROXY enabled in dev: forwarded headers affect secure detection.");
    }
  }

  return {
    environment: ENV.isProduction ? "production" : "development",
    trustProxy,
    appIdConfigured: Boolean(ENV.appId),
    oauthConfigured: Boolean(ENV.oAuthServerUrl),
    publicAppUrlConfigured,
    notes,
  };
}

/**
 * Log a single startup summary. Verbose detail when AUTH_DEPLOY_DEBUG=1.
 */
export function validateDeploymentAuthReadiness(): void {
  const report = assessDeploymentAuthReadiness();

  if (ENV.isProduction) {
    console.info(
      `[AuthDeploy] readiness env=production trustProxy=${report.trustProxy} appId=${report.appIdConfigured} oauth=${report.oauthConfigured} publicAppUrl=${report.publicAppUrlConfigured}`
    );
  }

  if (process.env.AUTH_DEPLOY_DEBUG === "1") {
    console.info("[AuthDeploy] detail", JSON.stringify(report, null, 2));
  }

  for (const note of report.notes) {
    if (ENV.isProduction && note.startsWith("TRUST_PROXY")) {
      console.warn(`[AuthDeploy] ${note}`);
    } else if (process.env.AUTH_DEPLOY_DEBUG === "1") {
      console.info(`[AuthDeploy] ${note}`);
    }
  }
}
