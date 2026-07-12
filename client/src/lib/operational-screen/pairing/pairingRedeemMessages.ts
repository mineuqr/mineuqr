import { TRPCClientError } from "@trpc/client";
import {
  PAIRING_REDEEM_FAILURE_CODES,
  isPairingRedeemFailureCode,
  type PairingRedeemFailureCode,
} from "../../../../../server/operational-device/pairing/pairingContracts";

const MESSAGES: Record<PairingRedeemFailureCode, { en: string; ar: string }> = {
  pairing_code_invalid: {
    en: "Invalid pairing code — check the code from Screen Management and try again.",
    ar: "رمز الربط غير صحيح — تحقق من الرمز من إدارة الشاشات وحاول مرة أخرى.",
  },
  pairing_code_used: {
    en: "This pairing code has already been used — request a new code from Screen Management.",
    ar: "تم استخدام رمز الربط — اطلب رمزاً جديداً من إدارة الشاشات.",
  },
  pairing_code_expired: {
    en: "This pairing code has expired — request a new code from Screen Management.",
    ar: "انتهت صلاحية رمز الربط — اطلب رمزاً جديداً من إدارة الشاشات.",
  },
  device_disabled: {
    en: "This screen has been disabled — re-enable it in Screen Management or request a new pairing code.",
    ar: "تم تعطيل هذه الشاشة — أعد تفعيلها من إدارة الشاشات أو اطلب رمز ربط جديداً.",
  },
  token_revoked: {
    en: "This pairing code is no longer valid — request a new code from Screen Management.",
    ar: "رمز الربط لم يعد صالحاً — اطلب رمزاً جديداً من إدارة الشاشات.",
  },
};

export function extractPairingRedeemFailureCode(error: unknown): PairingRedeemFailureCode {
  if (error instanceof TRPCClientError) {
    const message = error.message.trim();
    if (isPairingRedeemFailureCode(message)) {
      return message;
    }
    const lower = message.toLowerCase();
    for (const code of PAIRING_REDEEM_FAILURE_CODES) {
      if (lower.includes(code)) {
        return code;
      }
    }
  }
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    for (const code of PAIRING_REDEEM_FAILURE_CODES) {
      if (lower.includes(code)) {
        return code;
      }
    }
  }
  return "pairing_code_invalid";
}

export function pairingRedeemOperatorMessage(
  code: PairingRedeemFailureCode,
  language: string = "en"
): string {
  const isAr = language === "ar";
  return MESSAGES[code][isAr ? "ar" : "en"];
}

export function resolvePairingRedeemMessage(error: unknown, language: string = "en"): string {
  return pairingRedeemOperatorMessage(extractPairingRedeemFailureCode(error), language);
}
