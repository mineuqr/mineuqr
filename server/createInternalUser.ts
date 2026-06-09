import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { users } from "../drizzle/schema";
import type { InternalStaffCategory } from "@shared/accountClassification";
import { getDb, getUserByEmail, getUserByOpenId } from "./db";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export type CreateInternalUserInput = {
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
  staffCategory: InternalStaffCategory;
};

export type CreateInternalUserResult = {
  userId: number;
  email: string;
  role: "user" | "admin";
  accountClassification: "INTERNAL";
  staffCategory: InternalStaffCategory;
};

export function validateCreateInternalUserInput(input: CreateInternalUserInput): void {
  const email = input.email.trim().toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Valid email is required" });
  }
  if (!input.name.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Name is required" });
  }
  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Password must be at least 8 characters",
    });
  }
}

/**
 * ADMIN-AUTH-1B — operator-only internal staff account creation.
 * Classification is always INTERNAL; not exposed via public onboarding.
 */
export async function createInternalUser(
  input: CreateInternalUserInput
): Promise<CreateInternalUserResult> {
  validateCreateInternalUserInput(input);

  const email = input.email.trim().toLowerCase();
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
  }

  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  }

  const openId = `internal_${nanoid(12)}`;
  const openIdTaken = await getUserByOpenId(openId);
  if (openIdTaken) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not allocate account id" });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const userResult = await db.insert(users).values({
    openId,
    name: input.name.trim(),
    email,
    loginMethod: "email",
    role: input.role,
    accountClassification: "INTERNAL",
    passwordHash,
    lastSignedIn: new Date().toISOString(),
  });

  const userId = Number(userResult[0].insertId);
  if (!userId) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create internal user" });
  }

  return {
    userId,
    email,
    role: input.role,
    accountClassification: "INTERNAL",
    staffCategory: input.staffCategory,
  };
}
