import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { EMAIL_NOT_VERIFIED_ERR_MSG } from "@shared/const";
import type { SelectUser } from "../../drizzle/schema";
import {
  assertEmailVerificationSatisfied,
  isEmailVerificationEnforced,
  isEmailVerificationRequired,
  isEmailVerificationSatisfied,
  isProviderTrustedIdentity,
} from "./emailVerificationPolicy";

function baseUser(
  overrides: Partial<SelectUser> = {}
): SelectUser {
  return {
    id: 1,
    openId: "local_test@example.com",
    name: "Test",
    email: "test@example.com",
    loginMethod: "email",
    passwordHash: "hash",
    emailVerifiedAt: null,
    passwordChangedAt: null,
    sessionValidAfter: null,
    role: "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignedIn: new Date().toISOString(),
    ...overrides,
  };
}

describe("emailVerificationPolicy", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("isEmailVerificationEnforced", () => {
    it("is false by default", () => {
      delete process.env.AUTH_REQUIRE_VERIFIED_EMAIL;
      expect(isEmailVerificationEnforced()).toBe(false);
    });

    it("is true when AUTH_REQUIRE_VERIFIED_EMAIL=1", () => {
      vi.stubEnv("AUTH_REQUIRE_VERIFIED_EMAIL", "1");
      expect(isEmailVerificationEnforced()).toBe(true);
    });
  });

  describe("isEmailVerificationRequired", () => {
    it("requires verification for local email users", () => {
      expect(isEmailVerificationRequired(baseUser())).toBe(true);
    });

    it("does not require verification for admins", () => {
      expect(isEmailVerificationRequired(baseUser({ role: "admin" }))).toBe(false);
    });

    it("does not require verification when email is missing", () => {
      expect(isEmailVerificationRequired(baseUser({ email: null }))).toBe(false);
    });

    it("does not require verification for provider-trusted OAuth users", () => {
      expect(
        isEmailVerificationRequired(
          baseUser({ loginMethod: "manus", emailVerifiedAt: null })
        )
      ).toBe(false);
    });
  });

  describe("isProviderTrustedIdentity", () => {
    it("trusts non-email login methods with email on file", () => {
      expect(isProviderTrustedIdentity(baseUser({ loginMethod: "manus" }))).toBe(
        true
      );
    });

    it("does not trust local email login", () => {
      expect(isProviderTrustedIdentity(baseUser({ loginMethod: "email" }))).toBe(
        false
      );
    });
  });

  describe("isEmailVerificationSatisfied", () => {
    it("is always satisfied when enforcement is off", () => {
      delete process.env.AUTH_REQUIRE_VERIFIED_EMAIL;
      expect(isEmailVerificationSatisfied(baseUser())).toBe(true);
    });

    it("is satisfied for verified local users when enforcement is on", () => {
      vi.stubEnv("AUTH_REQUIRE_VERIFIED_EMAIL", "1");
      expect(
        isEmailVerificationSatisfied(
          baseUser({ emailVerifiedAt: new Date().toISOString() })
        )
      ).toBe(true);
    });

    it("is not satisfied for unverified local users when enforcement is on", () => {
      vi.stubEnv("AUTH_REQUIRE_VERIFIED_EMAIL", "1");
      expect(isEmailVerificationSatisfied(baseUser())).toBe(false);
    });

    it("is satisfied for OAuth users when enforcement is on", () => {
      vi.stubEnv("AUTH_REQUIRE_VERIFIED_EMAIL", "1");
      expect(
        isEmailVerificationSatisfied(
          baseUser({ loginMethod: "manus", emailVerifiedAt: null })
        )
      ).toBe(true);
    });
  });

  describe("assertEmailVerificationSatisfied", () => {
    it("does not throw when enforcement is off", () => {
      delete process.env.AUTH_REQUIRE_VERIFIED_EMAIL;
      expect(() => assertEmailVerificationSatisfied(baseUser())).not.toThrow();
    });

    it("throws FORBIDDEN with stable message when enforced and unverified", () => {
      vi.stubEnv("AUTH_REQUIRE_VERIFIED_EMAIL", "1");
      try {
        assertEmailVerificationSatisfied(baseUser());
        expect.fail("expected throw");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        const trpcError = error as TRPCError;
        expect(trpcError.code).toBe("FORBIDDEN");
        expect(trpcError.message).toBe(EMAIL_NOT_VERIFIED_ERR_MSG);
      }
    });
  });
});
