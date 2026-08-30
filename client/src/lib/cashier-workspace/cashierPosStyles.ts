/**
 * CASHIER-UX-FULLSCREEN-AND-THEME-1
 * CASHIER-UX-REDESIGN-1 — three-rail POS workspace tokens.
 * Cashier-only presentation. Does not change Dashboard theme.
 */

export const cashierPos = {
  root: "cashier-pos flex h-[100dvh] min-h-0 flex-col bg-[#f4f5f7] text-[#111827]",
  header:
    "flex shrink-0 flex-wrap items-center gap-2 border-b border-[#d8dee6] bg-[#111827] px-3 py-2 text-white",
  headerTitle: "text-base font-semibold text-white",
  headerMeta: "text-xs text-[#9ca3af]",
  status:
    "rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white",
  headerBtn:
    "min-h-11 rounded-lg border border-white/20 bg-transparent px-3 text-sm font-medium text-white hover:bg-white/10",
  headerBtnPrimary:
    "min-h-11 rounded-lg bg-[#4f46e5] px-3 text-sm font-semibold text-white hover:bg-[#4338ca]",
  headerBtnDanger:
    "min-h-11 rounded-lg border border-red-400/40 bg-transparent px-3 text-sm font-medium text-red-200 hover:bg-red-500/15",
  select:
    "min-h-11 min-w-[9rem] rounded-lg border border-white/20 bg-[#1f2937] px-3 text-sm text-white",
  body: "grid min-h-0 flex-1 grid-rows-[minmax(16rem,34%)_minmax(0,1fr)_minmax(12rem,28%)] lg:grid-rows-none lg:grid-cols-[minmax(18rem,26%)_minmax(0,1fr)_minmax(18rem,26%)]",
  /** LEFT — Current Order */
  orderRail:
    "flex min-h-0 flex-col overflow-hidden border-[#d8dee6] bg-white lg:border-e",
  orderScroll: "flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3",
  orderMeta: "space-y-0.5 text-xs text-[#6b7280]",
  orderHeading: "text-lg font-bold tabular-nums text-[#111827]",
  orderSource: "text-xs font-semibold uppercase tracking-wide text-[#4f46e5]",
  /** CENTER — Product workspace */
  catalog:
    "flex min-h-0 flex-col overflow-hidden border-[#d8dee6] bg-[#fafbfc] lg:border-e",
  catalogToolbar:
    "flex shrink-0 flex-col gap-2 border-b border-[#e5e7eb] bg-white p-3",
  catalogSearch:
    "min-h-11 w-full rounded-xl border border-[#d8dee6] bg-white px-3 text-sm text-[#111827]",
  catalogTools: "flex flex-wrap items-center gap-2",
  categoryBar: "flex shrink-0 gap-2 overflow-x-auto p-3 pb-1",
  categoryTile:
    "min-h-12 shrink-0 rounded-xl border px-3.5 text-sm font-medium transition-[box-shadow,background-color,border-color] duration-150",
  catalogScroll: "min-h-0 flex-1 overflow-auto p-3",
  productGrid:
    "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  productCard:
    "group relative flex min-h-[11rem] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white text-start shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,transform] duration-150 hover:border-[#c7d2fe] hover:shadow-[0_4px_12px_rgba(79,70,229,0.08)] motion-safe:active:scale-[0.99]",
  productCardUnavailable:
    "group relative flex min-h-[11rem] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] text-start opacity-70",
  productCardFlash:
    "ring-2 ring-[#4f46e5]/50 border-[#4f46e5]",
  productImage: "h-28 w-full object-cover",
  productFallback:
    "flex h-28 items-center justify-center bg-[#eef2f6] text-2xl font-semibold text-[#6b7280]",
  productBody: "flex flex-1 flex-col gap-1 p-2.5",
  productName: "line-clamp-2 text-sm font-semibold leading-snug text-[#111827]",
  productPrice: "text-sm font-bold tabular-nums text-[#4f46e5]",
  productAvail:
    "text-[11px] font-medium uppercase tracking-wide text-emerald-700",
  productUnavail:
    "text-[11px] font-medium uppercase tracking-wide text-red-600",
  productAdd:
    "ms-auto flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#4f46e5] text-white hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:bg-[#d1d5db]",
  productFav:
    "absolute end-2 top-2 z-10 flex size-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#6b7280] shadow-sm hover:text-[#4f46e5]",
  productFavActive: "text-[#7c3aed]",
  /** RIGHT — Contextual rail */
  aside: "flex min-h-0 flex-col overflow-hidden bg-[#f8fafc]",
  contextualRail: "flex min-h-0 flex-1 flex-col overflow-hidden bg-white",
  contextualHeader:
    "flex shrink-0 items-center justify-between gap-2 border-b border-[#e5e7eb] px-3 py-2.5",
  contextualTitle: "text-sm font-semibold text-[#111827]",
  contextualBadge:
    "rounded-full bg-[#eef2ff] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#4338ca]",
  contextualScroll: "min-h-0 flex-1 overflow-auto p-3",
  ticket: "flex min-h-0 flex-1 flex-col bg-white p-3",
  ticketLine:
    "flex items-center justify-between gap-2 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5",
  totalBox: "mt-auto rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3",
  totalValue: "text-2xl font-bold tabular-nums text-[#111827]",
  primaryAction:
    "min-h-12 w-full rounded-xl bg-[#4f46e5] text-base font-semibold text-white hover:bg-[#4338ca] disabled:bg-[#c7d2fe]",
  secondaryAction:
    "min-h-11 w-full rounded-xl border border-[#d8dee6] bg-white text-sm font-medium text-[#111827] hover:bg-[#f4f5f7]",
  dangerAction:
    "min-h-11 w-full rounded-xl border border-red-200 bg-white text-sm font-medium text-red-700 hover:bg-red-50",
  checkout: "min-h-0 overflow-auto border-t border-[#d8dee6] bg-white p-3",
  checkBox: "rounded-xl border border-[#d8dee6] bg-[#f4f5f7] p-3",
  paidBox:
    "rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-center text-emerald-900",
  paidStamp: "text-2xl font-bold tracking-wide text-emerald-700",
  warnBox: "rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950",
  orderBtn:
    "min-h-14 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-start transition-colors hover:border-[#c7d2fe]",
  orderBtnActive:
    "min-h-14 w-full rounded-xl border-[#4f46e5] bg-[#eef2ff] px-3 py-2.5 text-start ring-1 ring-[#4f46e5]/30",
  /** Payment workspace (right rail). Overlay kept for narrow viewports. */
  overlay:
    "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center lg:static lg:inset-auto lg:z-auto lg:flex lg:h-full lg:items-stretch lg:justify-stretch lg:bg-transparent lg:p-0",
  sheet:
    "flex max-h-[92dvh] w-full max-w-md flex-col overflow-auto rounded-2xl bg-white p-5 text-[#111827] lg:max-h-none lg:max-w-none lg:rounded-none lg:p-4",
  paymentWorkspace: "flex min-h-0 flex-1 flex-col overflow-auto bg-white p-4",
  amountDueHuge: "text-4xl font-bold tabular-nums text-[#111827]",
  moneyInput:
    "min-h-12 w-full rounded-xl border border-[#d8dee6] bg-white px-3 text-lg tabular-nums text-[#111827]",
  methodBtn:
    "min-h-12 flex-1 rounded-xl border border-[#d8dee6] bg-white px-3 text-sm font-semibold text-[#111827]",
  methodBtnActive:
    "min-h-12 flex-1 rounded-xl bg-[#4f46e5] px-3 text-sm font-semibold text-white",
  methodGrid: "grid grid-cols-2 gap-2",
} as const;
