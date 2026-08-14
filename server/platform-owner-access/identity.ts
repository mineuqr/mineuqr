/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Server-authoritative Platform Owner identity via ENV.ownerOpenId.
 * Fail closed when the env value is missing.
 */

import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";
import { isPlatformAccountUser } from "../platformAccount";
import { isOwnerOpenIdConfigured } from "../platformProtectionHealth";

export { isOwnerOpenIdConfigured };

export function isPlatformOwner(user: { openId: string } | null | undefined): boolean {
  if (!isOwnerOpenIdConfigured()) return false;
  return isPlatformAccountUser(user);
}

export function assertPlatformOwner(ctx: TrpcContext, procedure: string): void {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  if (!isPlatformOwner(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform Owner access is restricted",
    });
  }
  void procedure;
}
