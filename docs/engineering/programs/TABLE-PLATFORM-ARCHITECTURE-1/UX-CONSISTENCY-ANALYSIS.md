# UX Consistency Analysis — TABLE-PLATFORM-ARCHITECTURE-1

## Inconsistencies observed

| Dimension | Variants in production |
| --- | --- |
| **Shell** | Admin ops cyan/slate densetable vs reporting ledger vs Card+HTML vs CSS-grid |
| **Responsive** | Dual UI (table/cards) vs horizontal scroll only vs virtualized + card mode |
| **Density** | opsBadge compact vs reporting comfortable vs fleet dense |
| **Status** | SemanticBadge / Badge / span pills / plain text |
| **Empty** | AdminEmptyState vs RestaurantSectionEmpty vs inline copy vs null |
| **Loading** | AdminLoadingState vs SemanticKpiSkeleton vs Loader2 vs PageDataLoading |
| **Error** | SecuritySectionError vs RestaurantSectionError vs red text vs none |
| **Actions** | AdminActionGroup vs icon buttons vs none |
| **Toolbar** | ResponsiveOperationsBar vs Settlement filter strip vs Fleet filters vs none |
| **Pagination** | Page numbers vs load-more vs none |
| **Sorting** | Fleet only — other directories unsorted |
| **Selection** | None — no multi-select UX exists |

## User-facing impact

1. Admin operators learn one responsive pattern; restaurant reporting users get scroll-only tables on mobile.
2. Status colors differ between Accounts (semantic) and PaymentHistory (local), weakening Design System continuity after SEMANTIC-STATUS-BADGE-SYSTEM-1.
3. Security audit tables feel like clones with small column diffs — maintenance UX for engineers, not users, but visual drift risk is high.
4. Fleet is the only “premium” dense directory (virtualized + sort) — other directories look comparatively unfinished.

## Consistency target (for adoption program)

One Semantic Table chrome:

- Desktop: accessible table with sticky header option
- Mobile: declared strategy (card fallback **or** scroll — pick one default; allow override)
- Status cells: SemanticBadge only
- Empty/Loading/Error: shared Semantic table states
- Toolbar/Pagination: shared slots; feature owns filter fields
