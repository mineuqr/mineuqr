import { TRPCClientError } from "@trpc/client";
import { EMAIL_NOT_VERIFIED_ERR_MSG } from "@shared/const";
import { toast } from "sonner";

/** True when the server rejected the call because email is not verified (10003). */
export function isEmailNotVerifiedError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  if (error.message === EMAIL_NOT_VERIFIED_ERR_MSG) return true;
  return error.data?.code === "FORBIDDEN" && error.message.includes("10003");
}

/** Map tRPC errors to user-facing copy; hides raw 10003 codes. */
export function formatTrpcErrorForUser(
  error: unknown,
  t: (key: string) => string
): string {
  if (isEmailNotVerifiedError(error)) {
    return t("auth.trpcEmailNotVerified");
  }
  if (error instanceof TRPCClientError) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return t("common.error");
}

export function toastTrpcError(error: unknown, t: (key: string) => string): void {
  toast.error(formatTrpcErrorForUser(error, t));
}
