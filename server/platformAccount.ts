/**
 * ADMIN-AUTH-1D — single source of truth for ENV.ownerOpenId platform account detection.
 */
import { isPlatformAccountOpenId as matchPlatformOpenId } from "@shared/platformAccount";
import { ENV } from "./_core/env";
import { getUserById } from "./db";

export function getPlatformOwnerOpenId(): string {
  return ENV.ownerOpenId;
}

export function isPlatformAccountOpenId(openId: string | null | undefined): boolean {
  return matchPlatformOpenId(openId, getPlatformOwnerOpenId());
}

export function isPlatformAccountUser(
  user: { openId: string } | null | undefined
): boolean {
  return isPlatformAccountOpenId(user?.openId);
}

export async function isPlatformAccountUserId(userId: number): Promise<boolean> {
  const user = await getUserById(userId);
  return isPlatformAccountUser(user);
}
