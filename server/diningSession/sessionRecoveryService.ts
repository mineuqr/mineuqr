/**
 * TABLE-MANAGEMENT-1 D4 — public dining session recovery (customer-safe reads).
 */
import { getRestaurantBySlug, getTableByRestaurantAndNumber } from "../db";
import { findActiveSession, findSessionByToken } from "./sessionRepository";
import {
  isValidSessionTokenFormat,
  toPublicDiningSession,
  type PublicDiningSession,
} from "./sessionPublicStatus";

export async function getPublicActiveSessionByTable(
  slug: string,
  tableNumber: number
): Promise<PublicDiningSession | null> {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant?.isActive) return null;

  const table = await getTableByRestaurantAndNumber(restaurant.id, tableNumber);
  if (!table?.isActive) return null;

  const session = await findActiveSession(restaurant.id, table.id);
  if (!session) return null;

  return toPublicDiningSession(session);
}

export async function getPublicSessionByToken(
  slug: string,
  sessionToken: string
): Promise<PublicDiningSession | null> {
  if (!isValidSessionTokenFormat(sessionToken)) return null;

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant?.isActive) return null;

  const session = await findSessionByToken(restaurant.id, sessionToken);
  if (!session) return null;

  if (session.tableNumber <= 0) return null;

  return toPublicDiningSession(session);
}
