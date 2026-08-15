import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { Request, Response } from "express";
import { restaurants, userSubscriptions, users } from "../../drizzle/schema";
import { DEFAULT_ACCOUNT_CLASSIFICATION } from "@shared/accountClassification";
import { buildTrialSubscriptionForUser } from "../create-trial-subscription";
import { getDb, getUserByEmail, getUserByOpenId } from "../db";
import { sdk } from "../_core/sdk";
import { setSessionCookie } from "../_core/cookies";
import { logSuccessfulLogin } from "../_core/authAudit";
import { authOpsLog } from "../_core/authOpsMetadata";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { sendVerificationEmailForUser } from "./sendVerificationEmail";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export class RegisterValidationError extends Error {
  constructor(
    readonly code: "VALIDATION",
    readonly messageAr: string
  ) {
    super(messageAr);
  }
}

export class RegisterDuplicateEmailError extends Error {
  readonly messageAr = "البريد الإلكتروني مستخدم بالفعل";
}

export class RegisterOnboardingError extends Error {
  constructor(readonly messageAr: string) {
    super(messageAr);
  }
}

export type RegisterOwnerInput = {
  restaurantName: string;
  email: string;
  password: string;
  name?: string;
  phone?: string;
};

export type RegisterOwnerResult = {
  user: { id: number; name: string | null; email: string | null; role: string };
  openId: string;
  restaurantId: number;
  verificationEmailSent: boolean;
};

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "restaurant"}-${nanoid(6)}`;
}

export function parseRegisterBody(body: unknown): RegisterOwnerInput {
  const b = body as Record<string, unknown>;
  const restaurantName =
    typeof b.restaurantName === "string" ? b.restaurantName.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const name =
    typeof b.name === "string" && b.name.trim() ? b.name.trim() : undefined;
  const phone =
    typeof b.phone === "string" && b.phone.trim() ? b.phone.trim() : undefined;

  if (!restaurantName) {
    throw new RegisterValidationError(
      "VALIDATION",
      "اسم المطعم مطلوب"
    );
  }
  if (!email) {
    throw new RegisterValidationError("VALIDATION", "البريد الإلكتروني مطلوب");
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw new RegisterValidationError(
      "VALIDATION",
      "يرجى إدخال بريد إلكتروني صالح"
    );
  }
  if (!password) {
    throw new RegisterValidationError("VALIDATION", "كلمة المرور مطلوبة");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new RegisterValidationError(
      "VALIDATION",
      "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    );
  }

  return { restaurantName, email, password, name, phone };
}

async function registerOwnerTransactional(
  input: RegisterOwnerInput
): Promise<{ userId: number; openId: string; restaurantId: number }> {
  const existing = await getUserByEmail(input.email);
  if (existing) {
    throw new RegisterDuplicateEmailError();
  }

  const db = await getDb();
  if (!db) {
    throw new RegisterOnboardingError("قاعدة البيانات غير متاحة");
  }

  const openId = `local_${input.email}`;
  const openIdTaken = await getUserByOpenId(openId);
  if (openIdTaken) {
    throw new RegisterDuplicateEmailError();
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const slug = generateSlug(input.restaurantName);

  try {
    return await db.transaction(async (tx) => {
      const userResult = await tx.insert(users).values({
        openId,
        name: input.name ?? null,
        email: input.email,
        loginMethod: "email",
        role: "user",
        accountClassification: DEFAULT_ACCOUNT_CLASSIFICATION,
        passwordHash,
        lastSignedIn: new Date().toISOString(),
      });
      const userId = Number(userResult[0].insertId);
      if (!userId) {
        throw new RegisterOnboardingError("تعذر إنشاء الحساب");
      }

      const restaurantResult = await tx.insert(restaurants).values({
        userId,
        slug,
        nameAr: input.restaurantName,
        ownerEmail: input.email,
        phone: input.phone,
        isActive: true,
      });
      const restaurantId = Number(restaurantResult[0].insertId);
      if (!restaurantId) {
        throw new RegisterOnboardingError("تعذر إنشاء المطعم");
      }

      const trialPayload = await buildTrialSubscriptionForUser(userId, 0);
      await tx.insert(userSubscriptions).values(trialPayload);

      return { userId, openId, restaurantId };
    });
  } catch (error) {
    if (
      error instanceof RegisterDuplicateEmailError ||
      error instanceof RegisterOnboardingError ||
      error instanceof RegisterValidationError
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Duplicate") || message.includes("duplicate")) {
      throw new RegisterDuplicateEmailError();
    }
    console.error("[Auth Register] Transaction failed:", error);
    throw new RegisterOnboardingError("تعذر إكمال التسجيل");
  }
}

export async function registerLocalOwner(
  req: Request,
  res: Response,
  input: RegisterOwnerInput
): Promise<RegisterOwnerResult> {
  const { userId, openId, restaurantId } =
    await registerOwnerTransactional(input);

  const user = await getUserByOpenId(openId);
  if (!user) {
    throw new RegisterOnboardingError("تعذر تحميل الحساب بعد التسجيل");
  }

  const sessionToken = await sdk.createSessionToken(openId, {
    name: user.name || user.email || "User",
  });
  setSessionCookie(res, req, sessionToken);

  try {
    const { getCanonicalUserSubscription } = await import("../db");
    const {
      resolveTrialPolicyFromCatalog,
      bindSubscriptionToLivePlan,
      ensureCatalogReady,
    } = await import("../services/commercial-catalog");
    await ensureCatalogReady();
    const sub = await getCanonicalUserSubscription(userId);
    const policy = await resolveTrialPolicyFromCatalog();
    if (sub?.id && policy.professionalPlanId) {
      await bindSubscriptionToLivePlan({
        subscriptionId: sub.id,
        planId: policy.professionalPlanId,
        event: "trial_activated",
        actorId: userId,
      });
    }
  } catch (e) {
    console.warn("[Auth Register] Commercial snapshot capture skipped:", e);
  }

  authOpsLog({
    type: OPS_EVENT.email_verification_requested,
    severity: "info",
    req,
    actorId: userId,
    metadata: { source: "register", restaurantId },
  });

  const verificationEmailSent = await sendVerificationEmailForUser(req, user);

  logSuccessfulLogin(req, userId);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    openId,
    restaurantId,
    verificationEmailSent,
  };
}
