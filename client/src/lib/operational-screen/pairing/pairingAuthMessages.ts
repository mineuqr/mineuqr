import { TRPCClientError } from "@trpc/client";
import {
  DEVICE_AUTH_FAILURE_CODES,
  isDeviceAuthFailureCode,
  type DeviceAuthFailureCode,
} from "../../../../../server/operational-device/domain/deviceAuthCodes";

const MESSAGES: Record<DeviceAuthFailureCode, { en: string; ar: string }> = {
  invalid_credentials: {
    en: "Invalid pairing credentials — check the code from Screen Management and try again.",
    ar: "بيانات الربط غير صحيحة — تحقق من الرمز من إدارة الشاشات وحاول مرة أخرى.",
  },
  device_disabled: {
    en: "This screen has been disabled — re-enable it in Screen Management or request new credentials.",
    ar: "تم تعطيل هذه الشاشة — أعد تفعيلها من إدارة الشاشات أو اطلب اعتماداً جديداً.",
  },
  token_revoked: {
    en: "These credentials are no longer valid — request a new pairing code from Screen Management.",
    ar: "بيانات الاعتماد لم تعد صالحة — اطلب رمز ربط جديداً من إدارة الشاشات.",
  },
  token_expired: {
    en: "These credentials have expired — request a new pairing code from Screen Management.",
    ar: "انتهت صلاحية بيانات الاعتماد — اطلب رمز ربط جديداً من إدارة الشاشات.",
  },
};

export function extractDeviceAuthFailureCode(error: unknown): DeviceAuthFailureCode {
  if (error instanceof TRPCClientError) {
    const message = error.message.trim();
    if (isDeviceAuthFailureCode(message)) {
      return message;
    }
    const lower = message.toLowerCase();
    for (const code of DEVICE_AUTH_FAILURE_CODES) {
      if (lower.includes(code)) {
        return code;
      }
    }
  }
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    for (const code of DEVICE_AUTH_FAILURE_CODES) {
      if (lower.includes(code)) {
        return code;
      }
    }
  }
  return "invalid_credentials";
}

export function pairingAuthOperatorMessage(
  code: DeviceAuthFailureCode,
  language: string = "en"
): string {
  const isAr = language === "ar";
  return MESSAGES[code][isAr ? "ar" : "en"];
}

export function resolvePairingAuthMessage(error: unknown, language: string = "en"): string {
  return pairingAuthOperatorMessage(extractDeviceAuthFailureCode(error), language);
}
