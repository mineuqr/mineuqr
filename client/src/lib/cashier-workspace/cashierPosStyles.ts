/**
 * CASHIER-UX-FULLSCREEN-AND-THEME-1
 * CASHIER-UX-REDESIGN-1 / CASHIER-UX-REDESIGN-2 — POS workspace tokens.
 * Redesign-2: top Incoming strip, left Current Sale, wide Catalog, payment modal.
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
  /** TOP — Incoming QR notification strip */
  incomingBar:
    "flex shrink-0 items-center gap-3 border-b border-[#e5e7eb] bg-white px-3 py-2",
  incomingTrigger:
    "relative flex min-h-12 items-center gap-3 rounded-xl border border-[#e5e7eb] bg-[#fafbfc] px-4 text-start transition-colors hover:border-[#c7d2fe] hover:bg-[#eef2ff]",
  incomingTriggerActive:
    "relative flex min-h-12 items-center gap-3 rounded-xl border-[#4f46e5] bg-[#eef2ff] px-4 text-start ring-1 ring-[#4f46e5]/25",
  incomingTriggerPulse:
    "motion-safe:animate-pulse border-amber-300 bg-amber-50",
  incomingLabel: "text-sm font-semibold text-[#111827]",
  incomingHint: "text-xs text-[#6b7280]",
  incomingBadge:
    "ms-auto flex min-h-7 min-w-7 items-center justify-center rounded-full bg-[#4f46e5] px-2 text-xs font-bold tabular-nums text-white",
  incomingBadgeIdle:
    "ms-auto flex min-h-7 min-w-7 items-center justify-center rounded-full bg-[#e5e7eb] px-2 text-xs font-bold tabular-nums text-[#6b7280]",
  incomingPanel:
    "flex max-h-[min(70dvh,32rem)] w-[min(100vw-1.5rem,24rem)] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-lg",
  incomingPanelHeader:
    "flex shrink-0 items-center justify-between gap-2 border-b border-[#e5e7eb] px-4 py-3",
  incomingPanelScroll: "min-h-0 flex-1 overflow-auto p-3",
  /** BODY — Current Sale | wide Catalog (no permanent right rail) */
  body: "grid min-h-0 flex-1 grid-rows-[minmax(14rem,38%)_minmax(0,1fr)] lg:grid-rows-none lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]",
  orderRail:
    "flex min-h-0 flex-col overflow-hidden border-[#d8dee6] bg-white lg:border-e",
  orderScroll: "flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3",
  orderMeta: "space-y-0.5 text-xs text-[#6b7280]",
  orderHeading: "text-lg font-bold tabular-nums text-[#111827]",
  orderSource: "text-xs font-semibold uppercase tracking-wide text-[#4f46e5]",
  orderEmpty:
    "flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d8dee6] bg-[#fafbfc] px-4 py-8 text-center",
  orderEmptyTitle: "text-sm font-semibold text-[#374151]",
  orderEmptyHint: "text-xs text-[#6b7280]",
  catalog: "flex min-h-0 flex-col overflow-hidden bg-[#fafbfc]",
  catalogToolbar:
    "flex shrink-0 flex-col gap-2 border-b border-[#e5e7eb] bg-white p-3",
  catalogSearch:
    "min-h-11 w-full rounded-xl border border-[#d8dee6] bg-white px-3 text-sm text-[#111827]",
  catalogTools: "flex flex-wrap items-center gap-2",
  categoryBar:
    "flex shrink-0 gap-3 overflow-x-auto px-3 pb-3 pt-3 [scrollbar-width:thin]",
  categoryTile:
    "flex h-[4.75rem] w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 text-center transition-[box-shadow,background-color,border-color,transform] duration-150 motion-safe:active:scale-[0.98]",
  categoryIcon: "size-6 shrink-0",
  categoryLabel:
    "line-clamp-2 max-w-full text-[11px] font-semibold leading-tight",
  catalogScroll: "min-h-0 flex-1 overflow-auto p-3 sm:p-4",
  productGrid:
    "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
  productCard:
    "group relative flex min-h-[13.5rem] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white text-start shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,transform] duration-150 hover:border-[#c7d2fe] hover:shadow-[0_4px_12px_rgba(79,70,229,0.08)] motion-safe:active:scale-[0.99]",
  productCardUnavailable:
    "group relative flex min-h-[13.5rem] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] text-start opacity-70",
  productCardFlash: "ring-2 ring-[#4f46e5]/50 border-[#4f46e5]",
  productImage: "h-32 w-full object-cover",
  productFallback:
    "flex h-32 items-center justify-center bg-[#eef2f6] text-2xl font-semibold text-[#6b7280]",
  productBody: "flex flex-1 flex-col gap-1.5 p-3",
  productName: "line-clamp-2 text-sm font-semibold leading-snug text-[#111827]",
  productPrice: "text-base font-bold tabular-nums text-[#4f46e5]",
  productAvail:
    "text-[11px] font-medium uppercase tracking-wide text-emerald-700",
  productUnavail:
    "text-[11px] font-medium uppercase tracking-wide text-red-600",
  productAdd:
    "ms-auto flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#4f46e5] text-white hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:bg-[#d1d5db]",
  productFav:
    "absolute end-2 top-2 z-10 flex size-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#6b7280] shadow-sm hover:text-[#4f46e5]",
  productFavActive: "text-[#7c3aed]",
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
    "min-h-16 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-start transition-colors hover:border-[#c7d2fe]",
  orderBtnActive:
    "min-h-16 w-full rounded-xl border-[#4f46e5] bg-[#eef2ff] px-3 py-2.5 text-start ring-1 ring-[#4f46e5]/30",
  /** Payment modal — focused temporary overlay (not a permanent rail) */
  overlay:
    "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center",
  sheet:
    "flex max-h-[92dvh] w-full max-w-lg flex-col overflow-auto rounded-2xl bg-white p-5 text-[#111827] shadow-xl",
  paymentWorkspace: "flex min-h-0 flex-1 flex-col overflow-auto bg-white p-4",
  amountDueHuge: "text-4xl font-bold tabular-nums text-[#111827]",
  moneyInput:
    "min-h-12 w-full rounded-xl border border-[#d8dee6] bg-white px-3 text-lg tabular-nums text-[#111827]",
  methodBtn:
    "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#d8dee6] bg-white px-3 text-sm font-semibold text-[#111827]",
  methodBtnActive:
    "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border-[#4f46e5] bg-[#4f46e5] px-3 text-sm font-semibold text-white ring-2 ring-[#4f46e5]/30",
  methodGrid: "grid grid-cols-2 gap-3",
  methodIcon: "size-6 shrink-0",
} as const;
