/**
 * CASHIER-UX-REDESIGN-1 / CASHIER-UX-REDESIGN-2 — soft pastel category tiles.
 * Presentation only. Does not invent catalog taxonomy.
 */

export type CashierCategoryTint = {
  idle: string;
  selected: string;
};

const FALLBACK_TINTS: readonly CashierCategoryTint[] = [
  {
    idle: "border-[#e8ddd4] bg-[#faf4ef] text-[#4a3428]",
    selected: "border-[#d4a574] bg-[#f3e0d0] text-[#3f2e22] ring-2 ring-[#d4a574]/40",
  },
  {
    idle: "border-[#d9e4ef] bg-[#eef4fa] text-[#2c3f54]",
    selected: "border-[#7aa3c4] bg-[#d9e8f5] text-[#243447] ring-2 ring-[#7aa3c4]/40",
  },
  {
    idle: "border-[#e4ebe0] bg-[#f1f6ee] text-[#2f4530]",
    selected: "border-[#8fb38a] bg-[#ddebd8] text-[#2a3b2c] ring-2 ring-[#8fb38a]/40",
  },
  {
    idle: "border-[#eadde8] bg-[#f7f0f6] text-[#4a2f48]",
    selected: "border-[#c49bb8] bg-[#eddceb] text-[#3d2840] ring-2 ring-[#c49bb8]/40",
  },
  {
    idle: "border-[#ebe4d4] bg-[#f8f4ea] text-[#4a3f28]",
    selected: "border-[#d4c48a] bg-[#f0e8cf] text-[#3d3524] ring-2 ring-[#d4c48a]/40",
  },
];

const ALL_TINT: CashierCategoryTint = {
  idle: "border-[#c7d2fe] bg-[#eef2ff] text-[#312e81]",
  selected:
    "border-[#4f46e5] bg-[#4f46e5] text-white ring-2 ring-[#4f46e5]/35",
};

const FAVORITES_TINT: CashierCategoryTint = {
  idle: "border-[#e4d4f0] bg-[#f5eef9] text-[#4c2864]",
  selected:
    "border-[#a78bca] bg-[#e8daf4] text-[#3d2854] ring-2 ring-[#a78bca]/40",
};

function haystack(nameAr: string | null, nameEn: string | null): string {
  return `${nameAr ?? ""} ${nameEn ?? ""}`.toLowerCase();
}

function matchTint(h: string): CashierCategoryTint | null {
  if (/burger|برجر|برغر/.test(h)) {
    return {
      idle: "border-[#f0d9cc] bg-[#faf0eb] text-[#5a3224]",
      selected:
        "border-[#e0a890] bg-[#f5ddd0] text-[#4a2e24] ring-2 ring-[#e0a890]/40",
    };
  }
  if (/juice|عصير/.test(h)) {
    return {
      idle: "border-[#efe6c8] bg-[#faf6e8] text-[#5a4a20]",
      selected:
        "border-[#dcc978] bg-[#f3eac0] text-[#4a3d1c] ring-2 ring-[#dcc978]/40",
    };
  }
  if (/drink|beverage|مشروب|مشروبات/.test(h)) {
    return {
      idle: "border-[#d4e3f0] bg-[#eef5fb] text-[#2a4460]",
      selected:
        "border-[#8bb4d4] bg-[#dceaf6] text-[#243c54] ring-2 ring-[#8bb4d4]/40",
    };
  }
  if (/appetizer|starter|مقبلات|مقبل/.test(h)) {
    return {
      idle: "border-[#eadfcf] bg-[#f7f1e8] text-[#4c3a28]",
      selected:
        "border-[#d2b896] bg-[#efe2ce] text-[#3f3220] ring-2 ring-[#d2b896]/40",
    };
  }
  if (/salad|سلطة|سلطات/.test(h)) {
    return {
      idle: "border-[#d5e6d6] bg-[#eef6ee] text-[#2d4a30]",
      selected:
        "border-[#8fbf93] bg-[#d8ebd9] text-[#2a3f2c] ring-2 ring-[#8fbf93]/40",
    };
  }
  if (/dessert|حلو|حلويات|sweet/.test(h)) {
    return {
      idle: "border-[#f0d8e0] bg-[#faf0f3] text-[#5a2f3c]",
      selected:
        "border-[#e0a0b0] bg-[#f5dce4] text-[#4a2834] ring-2 ring-[#e0a0b0]/40",
    };
  }
  return null;
}

export function cashierAllCategoryTint(): CashierCategoryTint {
  return ALL_TINT;
}

export function cashierFavoritesCategoryTint(): CashierCategoryTint {
  return FAVORITES_TINT;
}

export function resolveCashierCategoryTint(input: {
  id: number;
  nameAr: string | null;
  nameEn: string | null;
}): CashierCategoryTint {
  const matched = matchTint(haystack(input.nameAr, input.nameEn));
  if (matched) return matched;
  return FALLBACK_TINTS[Math.abs(input.id) % FALLBACK_TINTS.length]!;
}
