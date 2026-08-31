/**
 * SAUDI-TAX-PROFILE-1
 * Persistence for saudi_tax_profiles. Tenant-scoped. Not financial authority.
 */

import { eq } from "drizzle-orm";
import {
  saudiTaxProfiles,
  type InsertSaudiTaxProfile,
  type SelectSaudiTaxProfile,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import type {
  SaudiTaxProfile,
  SaudiVatRegistrationStatus,
} from "@shared/compliance";

function mapRow(row: SelectSaudiTaxProfile): SaudiTaxProfile {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    countryCode: "SA",
    legalName: row.legalName,
    vatRegistrationStatus:
      row.vatRegistrationStatus as SaudiVatRegistrationStatus,
    vatNumber: row.vatNumber ?? null,
    registeredAddress: row.registeredAddress ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function findSaudiTaxProfileByRestaurantId(
  restaurantId: number
): Promise<SaudiTaxProfile | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(saudiTaxProfiles)
    .where(eq(saudiTaxProfiles.restaurantId, restaurantId))
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function upsertSaudiTaxProfileRow(
  data: Omit<InsertSaudiTaxProfile, "id" | "createdAt" | "updatedAt" | "countryCode"> & {
    countryCode?: "SA";
  }
): Promise<SaudiTaxProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await findSaudiTaxProfileByRestaurantId(data.restaurantId);
  if (existing) {
    await db
      .update(saudiTaxProfiles)
      .set({
        legalName: data.legalName,
        vatRegistrationStatus: data.vatRegistrationStatus,
        vatNumber: data.vatNumber ?? null,
        registeredAddress: data.registeredAddress ?? null,
      })
      .where(eq(saudiTaxProfiles.restaurantId, data.restaurantId));
    const updated = await findSaudiTaxProfileByRestaurantId(data.restaurantId);
    if (!updated) throw new Error("Saudi Tax Profile update failed");
    return updated;
  }

  await db.insert(saudiTaxProfiles).values({
    restaurantId: data.restaurantId,
    countryCode: "SA",
    legalName: data.legalName,
    vatRegistrationStatus: data.vatRegistrationStatus,
    vatNumber: data.vatNumber ?? null,
    registeredAddress: data.registeredAddress ?? null,
  });
  const created = await findSaudiTaxProfileByRestaurantId(data.restaurantId);
  if (!created) throw new Error("Saudi Tax Profile create failed");
  return created;
}
