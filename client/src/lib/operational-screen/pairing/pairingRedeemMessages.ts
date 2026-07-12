import { TRPCClientError } from "@trpc/client";
import {
  PAIRING_REDEEM_FAILURE_CODES,
  isPairingRedeemFailureCode,
  type PairingRedeemFailureCode,
} from "../../../../../server/operational-device/pairing/pairingContracts";

const MESSAGES: Record<PairingRedeemFailureCode, { en: string; ar: string }> = {
  pairing_code_invalid: {
    en: "Pairing code not found.",
    ar: "رمز الربط غير موجود.",
  },
  pairing_code_used: {
    en: "This pairing code has already been used. Copy a new code from Screen Management.",
    ar: "تم استخدام رمز الربط. انسخ رمزاً جديداً من إدارة الشاشات.",
  },
  pairing_code_expired: {
    en: "This pairing code has expired.",
    ar: "انتهت صلاحية رمز الربط.",
  },
  device_disabled: {
    en: "This screen was disabled in Screen Management.",
    ar: "تم تعطيل هذه الشاشة من إدارة الشاشات.",
  },
  token_revoked: {
    en: "This screen was removed or reset. Copy a new pairing code from Screen Management.",
    ar: "تمت إزالة الشاشة أو إعادة ضبطها. انسخ رمز ربط جديداً من إدارة الشاشات.",
  },
};

const FALLBACK = {
  en: "Unable to connect. Try again.",
  ar: "تعذر الاتصال. حاول مرة أخرى.",
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
  const code = extractPairingRedeemFailureCode(error);
  if (code === "pairing_code_invalid" && error instanceof Error && error.message && !isPairingRedeemFailureCode(error.message.trim())) {
    const isAr = language === "ar";
    return FALLBACK[isAr ? "ar" : "en"];
  }
  return pairingRedeemOperatorMessage(code, language);
}
