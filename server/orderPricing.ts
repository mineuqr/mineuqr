import { TRPCError } from "@trpc/server";
import type { SelectMenuItem } from "../drizzle/schema";
import { getMenuItemById } from "./db";

/** Public order line input — pricing fields are not trusted. */
export type OrderLineInput = {
  menuItemId: number;
  quantity: number;
  notes?: string | null;
};

export type ResolvedOrderLine = {
  menuItemId: number;
  nameAr: string;
  nameEn: string | null;
  /** Unit price from DB (2 decimal places). */
  price: string;
  quantity: number;
  notes: string | null;
  lineTotal: number;
};

function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

function parseUnitPrice(price: string | number): number {
  const n = typeof price === "number" ? price : parseFloat(String(price));
  if (!Number.isFinite(n) || n < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "سعر الصنف غير صالح",
    });
  }
  return n;
}

function assertMenuItemOrderable(
  menuItem: SelectMenuItem,
  restaurantId: number
): void {
  if (menuItem.restaurantId !== restaurantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "صنف لا يتبع هذا المطعم",
    });
  }
  if (!menuItem.isAvailable) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "الصنف غير متاح للطلب حالياً",
    });
  }
}

/**
 * Resolve cart lines using database prices only (LAUNCH-HARDENING-1A).
 */
export async function resolveAuthoritativeOrderLines(
  restaurantId: number,
  items: OrderLineInput[]
): Promise<{ lines: ResolvedOrderLine[]; totalAmount: string }> {
  if (items.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "السلة فارغة",
    });
  }

  const seen = new Set<number>();
  const lines: ResolvedOrderLine[] = [];

  for (const item of items) {
    if (seen.has(item.menuItemId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "صنف مكرر في الطلب",
      });
    }
    seen.add(item.menuItemId);

    const menuItem = await getMenuItemById(item.menuItemId);
    if (!menuItem) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "صنف غير موجود",
      });
    }

    assertMenuItemOrderable(menuItem, restaurantId);

    const unitPrice = parseUnitPrice(menuItem.price);
    const lineTotal = unitPrice * item.quantity;

    lines.push({
      menuItemId: menuItem.id,
      nameAr: menuItem.nameAr,
      nameEn: menuItem.nameEn ?? null,
      price: formatMoney(unitPrice),
      quantity: item.quantity,
      notes: item.notes ?? null,
      lineTotal,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  return {
    lines,
    totalAmount: formatMoney(subtotal),
  };
}
