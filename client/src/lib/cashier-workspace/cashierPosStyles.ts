/**
 * CASHIER-UX-FULLSCREEN-AND-THEME-1
 * Cashier-only presentation tokens. Does not change Dashboard theme.
 */

export const cashierPos = {
  root: "cashier-pos flex h-[100dvh] min-h-0 flex-col bg-[#f4f5f7] text-[#111827]",
  header:
    "flex shrink-0 flex-wrap items-center gap-2 border-b border-[#d8dee6] bg-white px-3 py-2",
  headerTitle: "text-base font-semibold text-[#111827]",
  headerMeta: "text-xs text-[#6b7280]",
  status:
    "rounded-full border border-[#d8dee6] bg-[#f4f5f7] px-2.5 py-1 text-xs font-medium text-[#374151]",
  headerBtn:
    "min-h-11 rounded-lg border border-[#d8dee6] bg-white px-3 text-sm font-medium text-[#111827] hover:bg-[#f4f5f7]",
  headerBtnPrimary:
    "min-h-11 rounded-lg bg-[#0f766e] px-3 text-sm font-semibold text-white hover:bg-[#0d9488]",
  select:
    "min-h-11 min-w-[9rem] rounded-lg border border-[#d8dee6] bg-white px-3 text-sm text-[#111827]",
  body: "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(14rem,42%)] lg:grid-rows-none lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]",
  catalog: "flex min-h-0 flex-col overflow-hidden border-[#d8dee6] bg-white lg:border-e",
  catalogScroll: "min-h-0 flex-1 overflow-auto p-3",
  categoryBar: "flex shrink-0 flex-wrap gap-2 border-b border-[#e5e7eb] bg-white p-3",
  categoryBtn:
    "min-h-11 rounded-full border border-[#d8dee6] bg-white px-3 text-sm text-[#111827]",
  categoryBtnActive: "min-h-11 rounded-full bg-[#0f766e] px-3 text-sm font-semibold text-white",
  productGrid:
    "grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  productCard:
    "min-h-28 rounded-xl border border-[#d8dee6] bg-white p-2 text-start active:scale-[0.99] hover:border-[#0f766e]",
  productImage: "mb-2 h-24 w-full rounded-lg object-cover",
  productFallback:
    "mb-2 flex h-24 items-center justify-center rounded-lg bg-[#eef2f6] text-xl font-semibold text-[#6b7280]",
  productName: "block text-sm font-semibold text-[#111827]",
  productPrice: "mt-1 block text-sm font-semibold tabular-nums text-[#0f766e]",
  aside: "flex min-h-0 flex-col overflow-hidden bg-[#f8fafc]",
  ticket: "flex min-h-0 flex-1 flex-col border-t border-[#d8dee6] bg-white p-3 lg:border-t-0",
  ticketLine:
    "flex items-center justify-between gap-2 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2",
  totalBox: "mt-2 rounded-xl border border-[#d8dee6] bg-[#f4f5f7] p-3",
  totalValue: "text-2xl font-bold tabular-nums text-[#0b3d36]",
  primaryAction:
    "min-h-12 w-full rounded-xl bg-[#0f766e] text-base font-semibold text-white hover:bg-[#0d9488]",
  checkout: "min-h-0 overflow-auto border-t border-[#d8dee6] bg-white p-3",
  checkBox: "rounded-xl border border-[#d8dee6] bg-[#f4f5f7] p-3",
  paidBox: "rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-900",
  warnBox: "rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950",
  orderBtn:
    "min-h-12 w-full rounded-xl border border-[#d8dee6] bg-white px-3 py-2 text-start",
  orderBtnActive: "min-h-12 w-full rounded-xl border-[#0f766e] bg-[#ecfdf8] px-3 py-2 text-start",
} as const;
