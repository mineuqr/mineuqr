import { Search, X } from "lucide-react";

export type MenuSearchAndCategoriesProps = {
  categories: any[];
  activeCategoryId: number | null;
  setActiveCategoryId: (id: number | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  accentColor: string;
  bgStyle: string;
  textColor?: string;
  pillStyle?: string;
  /**
   * KIOSK-BROWSE-PRESENTATION-ADOPTION-1 — kiosk owns a sticky chrome header;
   * disable sticky here so search/categories sit in document flow.
   */
  sticky?: boolean;
};

/**
 * Shared browse search + category chips (QR MenuTemplates + Self Ordering Kiosk).
 */
export function MenuSearchAndCategories({
  categories,
  activeCategoryId,
  setActiveCategoryId,
  searchQuery,
  setSearchQuery,
  accentColor,
  bgStyle,
  textColor,
  pillStyle,
  sticky = true,
}: MenuSearchAndCategoriesProps) {
  const tc = textColor || "white";
  return (
    <div
      className={`${sticky ? "sticky top-0 z-40" : "relative z-10"} backdrop-blur-xl border-b border-white/10`}
      style={{ background: bgStyle }}
    >
      <div className="container py-3">
        <div className="relative">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50"
            style={{ color: tc }}
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في المنيو..."
            className="w-full pr-10 pl-10 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: `1px solid rgba(255,255,255,0.15)`,
              color: tc,
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              style={{ color: tc }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {categories && categories.length > 0 && !searchQuery && (
        <div className="container pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {categories
              .filter((c) => c.isActive)
              .map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${pillStyle || ""}`}
                  style={
                    activeCategoryId === cat.id
                      ? { background: accentColor, color: "#000", fontWeight: 700 }
                      : { background: "rgba(255,255,255,0.08)", color: `${tc}99` }
                  }
                >
                  {cat.nameAr}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
