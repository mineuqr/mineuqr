/**
 * CASHIER-UX-REDESIGN-2 — category icons for scanability.
 * Presentation only. Does not invent catalog taxonomy.
 */

import type { LucideIcon } from "lucide-react";
import {
  Beef,
  CupSoda,
  GlassWater,
  Grid2X2,
  Heart,
  IceCream2,
  LayoutGrid,
  Salad,
  Soup,
  UtensilsCrossed,
} from "lucide-react";

function haystack(nameAr: string | null, nameEn: string | null): string {
  return `${nameAr ?? ""} ${nameEn ?? ""}`.toLowerCase();
}

export function cashierAllCategoryIcon(): LucideIcon {
  return LayoutGrid;
}

export function cashierFavoritesCategoryIcon(): LucideIcon {
  return Heart;
}

export function resolveCashierCategoryIcon(input: {
  nameAr: string | null;
  nameEn: string | null;
}): LucideIcon {
  const h = haystack(input.nameAr, input.nameEn);
  if (/burger|برجر|برغر/.test(h)) return Beef;
  if (/juice|عصير/.test(h)) return GlassWater;
  if (/drink|beverage|مشروب|مشروبات/.test(h)) return CupSoda;
  if (/appetizer|starter|مقبلات|مقبل/.test(h)) return Soup;
  if (/salad|سلطة|سلطات/.test(h)) return Salad;
  if (/dessert|حلو|حلويات|sweet/.test(h)) return IceCream2;
  if (/grill|مشو|كباب/.test(h)) return UtensilsCrossed;
  return Grid2X2;
}
