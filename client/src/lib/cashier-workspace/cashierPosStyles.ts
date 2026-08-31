/**
 * CASHIER-UX-FULLSCREEN-AND-THEME-1
 * CASHIER-UX-REDESIGN-1 / CASHIER-UX-REDESIGN-2 — POS workspace tokens.
 * Redesign-2: top Incoming + Search/Sort, left Current Sale (lg+), wide Catalog,
 * payment modal, adaptive tablet/mobile composition (sale sheet + cart dock).
 */

/** Primary operational text — one strong near-black across Cashier light surfaces */
export const CASHIER_TEXT_PRIMARY = "#111827" as const;
/** Level-4 supporting copy only (empty hints); not for labels/financials */
export const CASHIER_TEXT_MUTED = "#374151" as const;

export const cashierPos = {
  root: "cashier-pos flex h-[100dvh] min-h-0 flex-col overflow-x-hidden touch-manipulation bg-[#f4f5f7] text-[#111827]",
  header:
    "flex shrink-0 flex-wrap items-center gap-2 border-b border-[#d8dee6] bg-[#111827] px-3 py-2 text-white",
  headerTitle: "text-base font-semibold text-white",
  headerMeta: "text-xs text-[#9ca3af]",
  status:
    "rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white",
  headerBtn:
    "min-h-11 rounded-lg border border-white/20 bg-transparent px-3 text-sm font-medium text-white active:bg-white/10 hover:bg-white/10",
  headerBtnPrimary:
    "min-h-11 rounded-lg bg-[#4f46e5] px-3 text-sm font-semibold text-white active:bg-[#3730a3] hover:bg-[#4338ca]",
  headerBtnDanger:
    "min-h-11 rounded-lg border border-red-400/40 bg-transparent px-3 text-sm font-medium text-red-200 active:bg-red-500/15 hover:bg-red-500/15",
  select:
    "min-h-11 min-w-[9rem] max-w-full rounded-lg border border-white/20 bg-[#1f2937] px-3 text-sm text-white",
  /** TOP — Incoming + Search + Sort (one control region) */
  incomingBar:
    "flex shrink-0 flex-wrap items-center gap-2 border-b border-[#e5e7eb] bg-white px-2 py-2 sm:gap-2.5 sm:px-3",
  incomingTrigger:
    "relative flex min-h-11 w-full max-w-full items-center gap-2 rounded-xl border border-[#e5e7eb] bg-[#fafbfc] px-3 text-start transition-colors active:bg-[#eef2ff] hover:border-[#c7d2fe] hover:bg-[#eef2ff] sm:w-auto sm:max-w-[14rem] sm:shrink-0 md:max-w-[16rem]",
  incomingTriggerActive:
    "relative flex min-h-11 w-full max-w-full items-center gap-2 rounded-xl border-[#4f46e5] bg-[#eef2ff] px-3 text-start ring-1 ring-[#4f46e5]/25 sm:w-auto sm:max-w-[14rem] sm:shrink-0 md:max-w-[16rem]",
  incomingTriggerPulse:
    "motion-safe:animate-pulse border-amber-300 bg-amber-50",
  incomingLabel: "text-sm font-semibold text-[#111827]",
  incomingHint: "hidden text-xs font-medium text-[#111827] sm:inline",
  incomingBadge:
    "ms-auto flex min-h-7 min-w-7 items-center justify-center rounded-full bg-[#4f46e5] px-2 text-xs font-bold tabular-nums text-white",
  incomingBadgeIdle:
    "ms-auto flex min-h-7 min-w-7 items-center justify-center rounded-full bg-[#e5e7eb] px-2 text-xs font-bold tabular-nums text-[#111827]",
  incomingPanel:
    "flex max-h-[min(70dvh,32rem)] w-[min(100vw-1rem,24rem)] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-lg",
  incomingPanelHeader:
    "flex shrink-0 items-center justify-between gap-2 border-b border-[#e5e7eb] px-4 py-3",
  incomingPanelScroll: "min-h-0 flex-1 overflow-auto overscroll-contain p-3",
  topSearchSort:
    "flex min-w-0 flex-1 basis-[min(100%,18rem)] items-center gap-2 sm:basis-auto sm:min-w-[14rem] md:max-w-xl lg:max-w-2xl",
  catalogSearch:
    "min-h-11 min-w-0 flex-1 rounded-xl border border-[#d8dee6] bg-white px-3 text-sm text-[#111827] placeholder:text-[#374151]",
  catalogSort:
    "min-h-11 w-[7rem] shrink-0 rounded-xl border border-[#d8dee6] bg-white px-2 text-sm text-[#111827] sm:w-[8rem]",
  /**
   * BODY — adaptive:
   * - <lg: catalog-only column (sale is sheet)
   * - lg+: Current Sale | wide Catalog
   */
  body: "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]",
  /** Backdrop for mobile/tablet sale sheet */
  saleBackdrop: "fixed inset-0 z-30 bg-black/40 lg:hidden",
  orderRail:
    "z-40 flex min-h-0 flex-col overflow-hidden border-[#d8dee6] bg-white max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:max-h-[min(85dvh,42rem)] max-lg:rounded-t-2xl max-lg:border-t max-lg:shadow-[0_-8px_30px_rgba(15,23,42,0.12)] lg:relative lg:z-auto lg:max-h-none lg:rounded-none lg:border-e lg:shadow-none",
  orderRailClosed: "max-lg:hidden lg:flex",
  orderRailOpen: "flex",
  orderSheetHandle:
    "mx-auto mb-1 mt-2 h-1.5 w-12 shrink-0 rounded-full bg-[#d1d5db] lg:hidden",
  orderSheetClose:
    "absolute end-3 top-3 z-10 flex size-11 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#111827] lg:hidden",
  /** Header stays fixed; items scroll; footer (totals+PAY) stays pinned */
  orderBody: "flex min-h-0 flex-1 flex-col overflow-hidden",
  orderHeader: "shrink-0 border-b border-[#eef0f3] px-3 pb-1 pt-0.5",
  orderLines:
    "min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2.5 py-1",
  orderFooter:
    "shrink-0 border-t border-[#e5e7eb] bg-white px-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1",
  orderMeta: "space-y-0 text-[11px] font-medium leading-tight text-[#111827]",
  orderHeading: "text-base font-bold tabular-nums leading-tight text-[#111827]",
  orderSource: "text-[11px] font-semibold uppercase tracking-wide text-[#4f46e5]",
  orderEmpty:
    "flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d8dee6] bg-[#fafbfc] px-4 py-8 text-center",
  orderEmptyTitle: "text-sm font-semibold text-[#111827]",
  orderEmptyHint: "text-xs font-medium text-[#374151]",
  ticketLine:
    "flex min-w-0 items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-2 py-1",
  ticketLineName:
    "min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-[#111827]",
  ticketLineControls: "flex shrink-0 items-center gap-0.5",
  ticketLineQty:
    "inline-flex min-h-9 min-w-7 items-center justify-center rounded-md bg-white px-1 text-xs font-semibold tabular-nums text-[#111827]",
  ticketLinePrice:
    "shrink-0 text-end text-[13px] font-semibold tabular-nums leading-tight text-[#111827]",
  ticketLineDelete:
    "size-9 shrink-0 text-[#b91c1c] hover:bg-red-50 hover:text-[#991b1b]",
  orderScroll:
    "flex min-h-0 flex-1 flex-col gap-2 overflow-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
  totalBox: "space-y-0.5",
  summaryRow: "flex justify-between text-xs font-medium leading-5 text-[#111827]",
  totalRow:
    "mt-1 flex items-baseline justify-between border-t border-[#e5e7eb] pt-1.5",
  totalLabel: "text-sm font-bold text-[#111827]",
  totalValue: "text-lg font-bold tabular-nums text-[#111827]",
  categoryBar:
    "flex shrink-0 gap-3.5 overflow-x-auto overscroll-x-contain px-3 pb-3.5 pt-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]",
  categoryTile:
    "flex h-[5.75rem] w-[6.5rem] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border px-2.5 text-center transition-[box-shadow,background-color,border-color,transform] duration-150 motion-safe:active:scale-[0.98] sm:h-[5.5rem] sm:w-[6.25rem]",
  categoryIcon: "size-7 shrink-0 stroke-[2.25]",
  categoryLabel:
    "line-clamp-2 max-w-full text-xs font-bold leading-tight tracking-tight",
  /** Mobile/tablet cart dock — keeps Current Sale one tap away */
  cartDock:
    "flex shrink-0 items-center gap-2 border-t border-[#e5e7eb] bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden",
  cartDockBtn:
    "flex min-h-14 flex-1 items-center justify-between gap-3 rounded-2xl bg-[#111827] px-4 text-start text-white active:bg-[#1f2937]",
  cartDockMeta: "min-w-0",
  cartDockTitle: "block text-sm font-semibold",
  cartDockSub: "block text-xs text-[#9ca3af]",
  cartDockTotal: "shrink-0 text-base font-bold tabular-nums",
  catalog: "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#fafbfc]",
  catalogScroll:
    "min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-4",
  productGrid:
    "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
  productCard:
    "group relative flex min-h-[12.5rem] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white text-start shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,transform] duration-150 active:border-[#c7d2fe] hover:border-[#c7d2fe] hover:shadow-[0_4px_12px_rgba(79,70,229,0.08)] motion-safe:active:scale-[0.99] sm:min-h-[13.5rem]",
  productCardUnavailable:
    "group relative flex min-h-[12.5rem] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] text-start opacity-70 sm:min-h-[13.5rem]",
  productCardFlash: "ring-2 ring-[#4f46e5]/50 border-[#4f46e5]",
  productImage: "h-28 w-full object-cover sm:h-32",
  productFallback:
    "flex h-28 items-center justify-center bg-[#eef2f6] text-2xl font-semibold text-[#374151] sm:h-32",
  productBody: "flex flex-1 flex-col gap-1 p-3",
  productName: "line-clamp-2 text-sm font-semibold leading-snug text-[#111827]",
  productPrice: "text-base font-bold tabular-nums text-[#4f46e5]",
  productAvail:
    "text-[11px] font-medium uppercase tracking-wide text-emerald-700",
  productUnavail:
    "text-[11px] font-medium uppercase tracking-wide text-red-600",
  /** Secondary add affordance — card body is primary target */
  productAdd:
    "ms-auto flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#4f46e5] text-white active:bg-[#3730a3] hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:bg-[#d1d5db]",
  productFav:
    "absolute end-2 top-2 z-10 flex size-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#374151] shadow-sm active:text-[#4f46e5] hover:text-[#4f46e5]",
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
  primaryAction:
    "min-h-12 w-full rounded-xl bg-[#4f46e5] text-base font-bold tracking-tight text-white active:bg-[#3730a3] hover:bg-[#4338ca] disabled:bg-[#c7d2fe]",
  secondaryAction:
    "min-h-12 w-full rounded-xl border border-[#d8dee6] bg-white text-sm font-medium text-[#111827] active:bg-[#e5e7eb] hover:bg-[#f4f5f7]",
  dangerAction:
    "min-h-12 w-full rounded-xl border border-red-200 bg-white text-sm font-medium text-red-700 active:bg-red-100 hover:bg-red-50",
  checkout: "min-h-0 overflow-auto border-t border-[#d8dee6] bg-white p-3",
  checkBox: "rounded-xl border border-[#d8dee6] bg-[#f4f5f7] p-3",
  paidBox:
    "rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-center text-emerald-900",
  paidStamp: "text-2xl font-bold tracking-wide text-emerald-700",
  warnBox: "rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950",
  orderBtn:
    "min-h-16 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-start transition-colors active:border-[#c7d2fe] hover:border-[#c7d2fe]",
  orderBtnActive:
    "min-h-16 w-full rounded-xl border-[#4f46e5] bg-[#eef2ff] px-3 py-2.5 text-start ring-1 ring-[#4f46e5]/30",
  /** Payment modal — focused temporary overlay */
  overlay:
    "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-3",
  sheet:
    "flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-auto overscroll-contain rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#111827] shadow-xl sm:rounded-2xl sm:pb-5",
  paymentWorkspace: "flex min-h-0 flex-1 flex-col overflow-auto bg-white p-4",
  amountDueHuge: "text-3xl font-bold tabular-nums text-[#111827] sm:text-4xl",
  moneyInput:
    "min-h-12 w-full rounded-xl border border-[#d8dee6] bg-white px-3 text-lg tabular-nums text-[#111827]",
  /** Shared tender card chrome — hover elevates; active scales; selected via accent classes */
  methodBtn:
    "group flex min-h-[5rem] flex-col items-center justify-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold text-[#111827] transition-[transform,box-shadow,border-color,background-color] duration-150 hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)] motion-safe:active:scale-[0.98]",
  methodBtnActive:
    "group flex min-h-[5rem] flex-col items-center justify-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold text-[#111827] shadow-[0_2px_8px_rgba(15,23,42,0.06)] ring-2 motion-safe:active:scale-[0.98]",
  methodBtnCash: "border-[#a7f3d0] hover:border-emerald-400",
  methodBtnCashActive:
    "border-emerald-500 bg-emerald-50 ring-emerald-500/35",
  methodBtnNetwork: "border-[#bfdbfe] hover:border-blue-400",
  methodBtnNetworkActive: "border-blue-500 bg-blue-50 ring-blue-500/35",
  methodBtnMixed: "border-[#ddd6fe] hover:border-violet-400",
  methodBtnMixedActive: "border-violet-500 bg-violet-50 ring-violet-500/35",
  methodBtnGift: "border-[#fde68a] hover:border-amber-400",
  methodBtnGiftActive: "border-amber-500 bg-amber-50 ring-amber-500/35",
  methodIconWell:
    "flex size-11 items-center justify-center rounded-xl transition-colors",
  methodWellCash: "bg-emerald-100 text-emerald-700",
  methodWellCashActive: "bg-emerald-200 text-emerald-800",
  methodWellNetwork: "bg-blue-100 text-blue-700",
  methodWellNetworkActive: "bg-blue-200 text-blue-800",
  methodWellMixed: "bg-violet-100 text-violet-700",
  methodWellMixedActive: "bg-violet-200 text-violet-800",
  methodWellGift: "bg-amber-100 text-amber-700",
  methodWellGiftActive: "bg-amber-200 text-amber-800",
  methodGrid: "grid grid-cols-2 gap-3",
  methodIcon: "size-6 shrink-0",
  methodLabel: "text-sm font-semibold text-[#111827]",
  bodyText: "text-sm text-[#111827]",
  bodyTextSm: "text-xs text-[#111827]",
  mutedText: "text-xs font-medium text-[#374151]",
} as const;
