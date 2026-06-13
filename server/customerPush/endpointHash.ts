import { createHash } from "crypto";

export function hashPushEndpoint(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}
