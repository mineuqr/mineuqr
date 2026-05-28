import "dotenv/config";
import { COOKIE_NAME } from "../shared/const";
import { sdk } from "../server/_core/sdk";
import { createConnection } from "mysql2/promise";

type RunResult = { status: number; bodyText: string; ok: boolean; ms: number };

const baseUrl = process.env.VITE_BASE_URL || "http://localhost:3000";

async function pickUserOpenIdWithEmail(): Promise<{ openId: string; userId: number; email: string }> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing (required for local verification script)");
  const conn = await createConnection(url);
  try {
    const [rows] = await conn.query(
      "SELECT id, openId, email FROM users WHERE email IS NOT NULL AND email <> '' ORDER BY id ASC LIMIT 1"
    );
    const first = Array.isArray(rows) ? (rows[0] as any) : null;
    if (!first?.openId || !first?.id || !first?.email) {
      throw new Error("No user with email found in DB (need at least one row in users with email)");
    }
    return { openId: String(first.openId), userId: Number(first.id), email: String(first.email) };
  } finally {
    await conn.end();
  }
}

async function postRequestEmailVerification(cookieValue: string): Promise<RunResult> {
  const started = Date.now();
  const res = await fetch(`${baseUrl}/api/auth/request-email-verification`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${COOKIE_NAME}=${cookieValue}`,
    },
  });
  const bodyText = await res.text();
  return { status: res.status, bodyText, ok: res.ok, ms: Date.now() - started };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const picked = await pickUserOpenIdWithEmail();
  const token = await sdk.createSessionToken(picked.openId, { name: "Local Slice2 Verify" });

  console.log("[slice2] baseUrl:", baseUrl);
  console.log("[slice2] picked user:", { userId: picked.userId, openId: picked.openId, email: picked.email });

  // 1) Normal usage: first request should be success.
  const r1 = await postRequestEmailVerification(token);
  console.log("[slice2] normal #1:", r1);

  // 2) Rapid resend spam: immediate burst should trigger 60s suppression (still success response).
  for (let i = 0; i < 3; i++) {
    const r = await postRequestEmailVerification(token);
    console.log(`[slice2] rapid resend #${i + 1}:`, r);
    await sleep(150);
  }

  // 3) Actor-level throttling: exceed 5/10m attempts.
  for (let i = 0; i < 6; i++) {
    const r = await postRequestEmailVerification(token);
    console.log(`[slice2] actor-threshold probe #${i + 1}:`, r);
    await sleep(100);
  }

  // 4) IP-level backstop: push toward 15/10m total (may already be near from above).
  for (let i = 0; i < 12; i++) {
    const r = await postRequestEmailVerification(token);
    console.log(`[slice2] ip-backstop probe #${i + 1}:`, r);
    await sleep(80);
  }

  console.log("[slice2] done (inspect server logs for cooldowned ops events).");
}

main().catch((e) => {
  console.error("[slice2] script failed:", e);
  process.exit(1);
});

