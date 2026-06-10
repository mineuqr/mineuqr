import {
  isProtectedPlatformAccountUser,
  type PlatformAccountProtectable,
} from "@shared/platformAccount";
import type { AccountClassification } from "@shared/accountClassification";

type AccountUserRef = PlatformAccountProtectable & {
  id: number;
  role?: "admin" | "user";
  accountClassification?: AccountClassification;
};

export function canEditAccountGovernance(
  target: AccountUserRef,
  currentUserId: number | undefined
): boolean {
  return target.id !== currentUserId && !isProtectedPlatformAccountUser(target);
}

export function canDeleteAccountUser(
  target: AccountUserRef,
  currentUserId: number | undefined
): boolean {
  return canEditAccountGovernance(target, currentUserId);
}

export function canMutateAccountLifecycle(target: AccountUserRef): boolean {
  return !isProtectedPlatformAccountUser(target);
}
