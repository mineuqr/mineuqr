/**
 * REGISTER-CATALOG-VALIDATION-PRESENTATION-1
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  catalogFieldErrorId,
  presentRegisterCatalogError,
  registerCatalogValidationMessage,
} from "../registerCatalogValidationPresentation";

describe("presentRegisterCatalogError", () => {
  it("maps Zod fieldErrors for required code / displayName / registerType", () => {
    const presented = presentRegisterCatalogError({
      data: {
        code: "BAD_REQUEST",
        zodError: {
          fieldErrors: {
            code: ["Required"],
            displayName: ["String must contain at least 1 character(s)"],
            registerType: ["Required"],
          },
          formErrors: [],
        },
      },
    });
    expect(presented.fieldErrors.code).toBe("code.required");
    expect(presented.fieldErrors.displayName).toBe("displayName.required");
    expect(presented.fieldErrors.registerType).toBe("registerType.required");
    expect(presented.globalKey).toBeNull();
    expect(presented.firstInvalidField).toBe("code");
  });

  it("maps Zod issues JSON in message for code too long", () => {
    const presented = presentRegisterCatalogError({
      data: { code: "BAD_REQUEST" },
      message: JSON.stringify([
        {
          code: "too_big",
          maximum: 64,
          path: ["code"],
          message: "String must contain at most 64 character(s)",
        },
      ]),
    });
    expect(presented.fieldErrors.code).toBe("code.tooLong");
    expect(presented.firstInvalidField).toBe("code");
    expect(presented.globalKey).toBeNull();
  });

  it("maps CONFLICT catalog uniqueness to duplicateCode on code field", () => {
    const presented = presentRegisterCatalogError({
      data: { code: "CONFLICT" },
      message: "Register operation conflict",
    });
    expect(presented.fieldErrors.code).toBe("duplicateCode");
    expect(presented.globalKey).toBeNull();
    expect(presented.firstInvalidField).toBe("code");
  });

  it("maps forbidden / offline / unknown as global only", () => {
    expect(
      presentRegisterCatalogError({ data: { code: "FORBIDDEN" } }).globalKey
    ).toBe("forbidden");
    expect(
      presentRegisterCatalogError({
        message: "Failed to fetch",
      }).globalKey
    ).toBe("offline");
    expect(
      presentRegisterCatalogError({
        data: { code: "INTERNAL_SERVER_ERROR" },
        message: "boom",
      }).globalKey
    ).toBe("unknown");
  });

  it("never returns raw Zod / stack text as the message key surface", () => {
    const presented = presentRegisterCatalogError({
      data: {
        code: "BAD_REQUEST",
        zodError: {
          fieldErrors: { code: ['Expected string, received "null"'] },
        },
      },
      message: "[\n  {\n    \"code\": \"invalid_type\",\n    \"path\": [\"code\"]\n  }\n]",
    });
    expect(presented.fieldErrors.code).toMatch(/^code\./);
    expect(JSON.stringify(presented)).not.toContain("invalid_type");
    expect(JSON.stringify(presented)).not.toContain("Expected string");
  });

  it("Arabic localization is user-friendly", () => {
    expect(registerCatalogValidationMessage("code.required", "ar")).toBe(
      "الرمز مطلوب."
    );
    expect(registerCatalogValidationMessage("displayName.required", "ar")).toBe(
      "الاسم المعروض مطلوب."
    );
    expect(registerCatalogValidationMessage("registerType.required", "ar")).toBe(
      "نوع الصندوق مطلوب."
    );
    expect(registerCatalogValidationMessage("duplicateCode", "ar")).toBe(
      "يوجد صندوق آخر بنفس الرمز."
    );
    expect(registerCatalogValidationMessage("unknown", "ar")).toBe(
      "تعذر تنفيذ العملية، يرجى المحاولة مرة أخرى."
    );
  });

  it("field error ids are stable for aria-describedby", () => {
    expect(catalogFieldErrorId("code")).toBe("register-catalog-code-error");
    expect(catalogFieldErrorId("displayName")).toBe(
      "register-catalog-displayName-error"
    );
  });
});
