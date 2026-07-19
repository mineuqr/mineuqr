/**
 * ADR-ARCH-020 / CHECK-GENERALIZATION-M1 — Check-owned Order membership contracts.
 * Membership is NOT an aggregate root. Persistence only in M1 (dual-write).
 */

export const CHECK_MEMBERSHIP_ENROLLED_REASONS = [
  "session_attach",
  "order_place",
  "backfill",
  "manual",
] as const;

export type CheckMembershipEnrolledReason =
  (typeof CHECK_MEMBERSHIP_ENROLLED_REASONS)[number];

export type CheckOrderMembershipRecord = Readonly<{
  id: number;
  restaurantId: number;
  checkId: number;
  orderId: number;
  enrolledAt: string;
  enrolledReason: CheckMembershipEnrolledReason;
  active: boolean;
}>;
