/**
 * SAUDI-TAX-PROFILE-1
 * Saudi Tax Profile service — Compliance Layer only.
 * Does not create Collection Facts, PAID, Tax Invoices, IRN, or QR.
 */

import { TRPCError } from "@trpc/server";
import {
  evaluateSaudiTaxProfileReadiness,
  normalizeCountryCode,
  normalizeSaudiVatNumberInput,
  SAUDI_VAT_REGISTRATION_STATUSES,
  validateSaudiVatNumberStructure,
  type SaudiTaxProfileUpsertInput,
  type SaudiTaxProfileView,
  type SaudiVatRegistrationStatus,
} from "@shared/compliance";
import { emitAuditEvent } from "../../audit/auditEmitter";
import { getRestaurantById } from "../../db";
import {
  findSaudiTaxProfileByRestaurantId,
  upsertSaudiTaxProfileRow,
} from "./saudiTaxProfileRepository";

function assertSaudiJurisdiction(countryCode: string | null | undefined): void {
  if (normalizeCountryCode(countryCode) !== "SA") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Saudi Tax Profile is available only when restaurant countryCode is SA",
    });
  }
}

function parseVatStatus(value: string): SaudiVatRegistrationStatus {
  if (
    (SAUDI_VAT_REGISTRATION_STATUSES as readonly string[]).includes(value)
  ) {
    return value as SaudiVatRegistrationStatus;
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Invalid VAT registration status",
  });
}

export async function getSaudiTaxProfileView(
  restaurantId: number
): Promise<SaudiTaxProfileView> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
  }

  const countryCode = normalizeCountryCode(restaurant.countryCode);
  const applicable = countryCode === "SA";
  if (!applicable) {
    return {
      applicable: false,
      readiness: "NOT_CONFIGURED",
      profile: null,
      vatNumberValidation: "empty",
    };
  }

  const profile = await findSaudiTaxProfileByRestaurantId(restaurantId);
  const { readiness, vatNumberValidation } =
    evaluateSaudiTaxProfileReadiness(profile);
  return {
    applicable: true,
    readiness,
    profile,
    vatNumberValidation,
  };
}

export async function upsertSaudiTaxProfile(
  input: SaudiTaxProfileUpsertInput,
  actor: { userId: number; role: string | null }
): Promise<SaudiTaxProfileView> {
  const restaurant = await getRestaurantById(input.restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
  }
  assertSaudiJurisdiction(restaurant.countryCode);

  const legalName = input.legalName.trim();
  if (legalName.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Legal / business name is required",
    });
  }

  const vatRegistrationStatus = parseVatStatus(input.vatRegistrationStatus);
  const vatNumberRaw = normalizeSaudiVatNumberInput(input.vatNumber);
  const vatNumber = vatNumberRaw.length === 0 ? null : vatNumberRaw;
  const registeredAddress =
    input.registeredAddress == null || input.registeredAddress.trim() === ""
      ? null
      : input.registeredAddress.trim();

  if (vatRegistrationStatus === "registered") {
    const outcome = validateSaudiVatNumberStructure(vatNumber);
    if (outcome !== "structurally_valid") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "VAT registration number must be 15 digits starting with 3 when status is registered",
      });
    }
    if (!registeredAddress) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Registered business address is required when VAT registered",
      });
    }
  }

  const before = await findSaudiTaxProfileByRestaurantId(input.restaurantId);
  const profile = await upsertSaudiTaxProfileRow({
    restaurantId: input.restaurantId,
    legalName,
    vatRegistrationStatus,
    vatNumber,
    registeredAddress,
  });

  emitAuditEvent({
    eventType: "saudi_tax_profile.upsert",
    category: "COMMERCIAL",
    severity: "info",
    actorId: actor.userId,
    actorRole: actor.role,
    targetType: "restaurant",
    targetId: input.restaurantId,
    procedure: "saudiTaxProfile.upsert",
    before: before
      ? {
          legalName: before.legalName,
          vatRegistrationStatus: before.vatRegistrationStatus,
          vatNumber: before.vatNumber,
          registeredAddress: before.registeredAddress,
        }
      : null,
    after: {
      legalName: profile.legalName,
      vatRegistrationStatus: profile.vatRegistrationStatus,
      vatNumber: profile.vatNumber,
      registeredAddress: profile.registeredAddress,
    },
    metadata: { program: "SAUDI-TAX-PROFILE-1" },
  });

  const { readiness, vatNumberValidation } =
    evaluateSaudiTaxProfileReadiness(profile);
  return {
    applicable: true,
    readiness,
    profile,
    vatNumberValidation,
  };
}
