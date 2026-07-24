/**
 * REGISTER-CATALOG-VALIDATION-PRESENTATION-1 — presentation-only error mapping.
 * Does not validate business rules. Maps server/TRPC/Zod shapes → UI fields + copy keys.
 */

import type { CatalogLanguage } from "./registerCatalogCopy";

export type CatalogFormField = "code" | "displayName" | "registerType";

export type CatalogValidationMessageKey =
  | "code.required"
  | "code.invalid"
  | "code.tooLong"
  | "displayName.required"
  | "displayName.tooLong"
  | "registerType.required"
  | "registerType.invalid"
  | "duplicateCode"
  | "inactive"
  | "dutyOpen"
  | "shiftActive"
  | "archived"
  | "forbidden"
  | "offline"
  | "notFound"
  | "conflict"
  | "unknown";

export type CatalogPresentedError = Readonly<{
  fieldErrors: Partial<Record<CatalogFormField, CatalogValidationMessageKey>>;
  /** Global banner — only when not field-attachable. */
  globalKey: CatalogValidationMessageKey | null;
  firstInvalidField: CatalogFormField | null;
}>;

const FIELD_ORDER: CatalogFormField[] = [
  "code",
  "displayName",
  "registerType",
];

const VALIDATION_COPY: Record<
  CatalogValidationMessageKey,
  Record<CatalogLanguage, string>
> = {
  "code.required": {
    ar: "الرمز مطلوب.",
    en: "Register code is required.",
  },
  "code.invalid": {
    ar: "الرمز يجب أن يبدأ بحرف أو رقم ويمكن أن يحتوي على _ أو -.",
    en: "Code must start with a letter or number and may include _ or -.",
  },
  "code.tooLong": {
    ar: "الرمز طويل جداً.",
    en: "Register code is too long.",
  },
  "displayName.required": {
    ar: "الاسم المعروض مطلوب.",
    en: "Display name is required.",
  },
  "displayName.tooLong": {
    ar: "الاسم المعروض طويل جداً.",
    en: "Display name is too long.",
  },
  "registerType.required": {
    ar: "نوع الصندوق مطلوب.",
    en: "Register type is required.",
  },
  "registerType.invalid": {
    ar: "نوع الصندوق غير صالح.",
    en: "Register type is invalid.",
  },
  duplicateCode: {
    ar: "يوجد صندوق آخر بنفس الرمز.",
    en: "Another register already uses this code.",
  },
  inactive: {
    ar: "لا يمكن تنفيذ العملية على صندوق غير نشط.",
    en: "This action is not available for an inactive register.",
  },
  dutyOpen: {
    ar: "أغلق وردية التشغيل أولاً ثم أعد المحاولة.",
    en: "Close register duty first, then try again.",
  },
  shiftActive: {
    ar: "لا يمكن المتابعة أثناء وجود وردية مالية مفتوحة.",
    en: "Cannot continue while a financial shift is open.",
  },
  archived: {
    ar: "لا يمكن تعديل صندوق مؤرشف.",
    en: "An archived register cannot be modified.",
  },
  forbidden: {
    ar: "لا تملك صلاحية تنفيذ هذه العملية.",
    en: "You do not have permission for this action.",
  },
  offline: {
    ar: "لا يوجد اتصال — تحقق من الشبكة ثم أعد المحاولة.",
    en: "Offline — check the network and retry.",
  },
  notFound: {
    ar: "الصندوق غير موجود.",
    en: "Register not found.",
  },
  conflict: {
    ar: "تعارض في حالة الصندوق — حدّث الصفحة ثم أعد المحاولة.",
    en: "Register state conflict — refresh and retry.",
  },
  unknown: {
    ar: "تعذر تنفيذ العملية، يرجى المحاولة مرة أخرى.",
    en: "Could not complete the action. Please try again.",
  },
};

export function registerCatalogValidationMessage(
  key: CatalogValidationMessageKey,
  language: CatalogLanguage
): string {
  return VALIDATION_COPY[key][language];
}

type ZodIssueLike = {
  path?: Array<string | number>;
  code?: string;
  message?: string;
  maximum?: number;
  minimum?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function extractTrpcCode(error: unknown): string | null {
  const err = asRecord(error);
  if (!err) return null;
  const data = asRecord(err.data);
  if (typeof data?.code === "string") return data.code;
  const shape = asRecord(err.shape);
  const shapeData = asRecord(shape?.data);
  if (typeof shapeData?.code === "string") return shapeData.code;
  return null;
}

function extractZodFieldErrors(
  error: unknown
): Partial<Record<CatalogFormField, string[]>> {
  const out: Partial<Record<CatalogFormField, string[]>> = {};
  const err = asRecord(error);
  if (!err) return out;

  const data = asRecord(err.data) ?? asRecord(asRecord(err.shape)?.data);
  const zodError = asRecord(data?.zodError);
  const fieldErrors = asRecord(zodError?.fieldErrors);
  if (fieldErrors) {
    for (const field of FIELD_ORDER) {
      const msgs = fieldErrors[field];
      if (Array.isArray(msgs) && msgs.length > 0) {
        out[field] = msgs.map(String);
      }
    }
  }

  const issues: ZodIssueLike[] = [];
  if (Array.isArray(zodError?.issues)) {
    issues.push(...(zodError!.issues as ZodIssueLike[]));
  }
  if (typeof err.message === "string") {
    const trimmed = err.message.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          issues.push(...(parsed as ZodIssueLike[]));
        } else {
          const form = asRecord(parsed);
          if (Array.isArray(form?.issues)) {
            issues.push(...(form!.issues as ZodIssueLike[]));
          }
        }
      } catch {
        /* ignore non-JSON messages */
      }
    }
  }

  for (const issue of issues) {
    const path0 = issue.path?.[0];
    if (path0 !== "code" && path0 !== "displayName" && path0 !== "registerType") {
      continue;
    }
    const field = path0 as CatalogFormField;
    const msg = String(issue.message ?? issue.code ?? "invalid");
    out[field] = [...(out[field] ?? []), msg];
  }

  return out;
}

function mapZodMessageToKey(
  field: CatalogFormField,
  raw: string
): CatalogValidationMessageKey {
  const m = raw.toLowerCase();
  if (
    m.includes("required") ||
    m.includes("too_small") ||
    m.includes("at least") ||
    m.includes("string must contain at least") ||
    m === "required"
  ) {
    if (field === "code") return "code.required";
    if (field === "displayName") return "displayName.required";
    return "registerType.required";
  }
  if (m.includes("too_big") || m.includes("at most") || m.includes("too long")) {
    if (field === "code") return "code.tooLong";
    if (field === "displayName") return "displayName.tooLong";
  }
  if (field === "registerType") return "registerType.invalid";
  if (field === "code") return "code.invalid";
  return "displayName.required";
}

function mapOperatorMessageToKey(message: string): CatalogValidationMessageKey | null {
  const m = message.toLowerCase();
  if (m.includes("already used") || m.includes("duplicate")) return "duplicateCode";
  if (m.includes("financial shift is active")) return "shiftActive";
  if (m.includes("duty is not closed") || m.includes("duty must be closed")) {
    return "dutyOpen";
  }
  if (m.includes("archived")) return "archived";
  if (m.includes("inactive")) return "inactive";
  if (m.includes("register code") || m.includes("code must") || m.includes("code required")) {
    return "code.invalid";
  }
  if (m.includes("displayname") || m.includes("display name")) {
    return "displayName.required";
  }
  return null;
}

function isOffline(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const err = asRecord(error);
  const msg = typeof err?.message === "string" ? err.message : "";
  return /network|fetch|offline|failed to fetch/i.test(msg);
}

/**
 * Map any catalog mutation/query failure into field + global presentation keys.
 * Never returns raw Zod/TRPC text.
 */
export function presentRegisterCatalogError(
  error: unknown
): CatalogPresentedError {
  if (isOffline(error)) {
    return {
      fieldErrors: {},
      globalKey: "offline",
      firstInvalidField: null,
    };
  }

  const trpcCode = extractTrpcCode(error);
  const zodFields = extractZodFieldErrors(error);
  const fieldErrors: Partial<
    Record<CatalogFormField, CatalogValidationMessageKey>
  > = {};

  for (const field of FIELD_ORDER) {
    const msgs = zodFields[field];
    if (msgs?.[0]) {
      fieldErrors[field] = mapZodMessageToKey(field, msgs[0]);
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstInvalidField =
      FIELD_ORDER.find((f) => fieldErrors[f] != null) ?? null;
    return { fieldErrors, globalKey: null, firstInvalidField };
  }

  const err = asRecord(error);
  const message = typeof err?.message === "string" ? err.message : "";
  const fromMessage = mapOperatorMessageToKey(message);

  if (trpcCode === "FORBIDDEN" || trpcCode === "UNAUTHORIZED") {
    return {
      fieldErrors: {},
      globalKey: "forbidden",
      firstInvalidField: null,
    };
  }
  if (trpcCode === "NOT_FOUND") {
    return {
      fieldErrors: {},
      globalKey: "notFound",
      firstInvalidField: null,
    };
  }
  if (trpcCode === "CONFLICT") {
    if (fromMessage === "duplicateCode") {
      return {
        fieldErrors: { code: "duplicateCode" },
        globalKey: null,
        firstInvalidField: "code",
      };
    }
    // Catalog create/update uniqueness commonly surfaces as CONFLICT.
    if (
      message.toLowerCase().includes("conflict") ||
      message === "Register operation conflict"
    ) {
      return {
        fieldErrors: { code: "duplicateCode" },
        globalKey: null,
        firstInvalidField: "code",
      };
    }
    return {
      fieldErrors: {},
      globalKey: fromMessage ?? "conflict",
      firstInvalidField: null,
    };
  }
  if (trpcCode === "BAD_REQUEST") {
    if (fromMessage === "code.invalid" || fromMessage === "code.required") {
      return {
        fieldErrors: { code: fromMessage },
        globalKey: null,
        firstInvalidField: "code",
      };
    }
    if (fromMessage) {
      const fieldAttached =
        fromMessage.startsWith("code.") ||
        fromMessage.startsWith("displayName.") ||
        fromMessage.startsWith("registerType.") ||
        fromMessage === "duplicateCode";
      if (fieldAttached) {
        const field: CatalogFormField =
          fromMessage === "duplicateCode" || fromMessage.startsWith("code.")
            ? "code"
            : fromMessage.startsWith("displayName.")
              ? "displayName"
              : "registerType";
        return {
          fieldErrors: { [field]: fromMessage },
          globalKey: null,
          firstInvalidField: field,
        };
      }
      return {
        fieldErrors: {},
        globalKey: fromMessage,
        firstInvalidField: null,
      };
    }
    return {
      fieldErrors: {},
      globalKey: "unknown",
      firstInvalidField: null,
    };
  }

  if (fromMessage) {
    if (fromMessage === "duplicateCode") {
      return {
        fieldErrors: { code: "duplicateCode" },
        globalKey: null,
        firstInvalidField: "code",
      };
    }
    return {
      fieldErrors: {},
      globalKey: fromMessage,
      firstInvalidField: null,
    };
  }

  return {
    fieldErrors: {},
    globalKey: "unknown",
    firstInvalidField: null,
  };
}

export function catalogFieldErrorId(field: CatalogFormField): string {
  return `register-catalog-${field}-error`;
}
