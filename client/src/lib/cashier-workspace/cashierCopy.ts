/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1
 * Presentation copy only. Not a permission catalog. Not plan entitlements.
 */

export type CashierLang = "ar" | "en";

const COPY: Record<string, { ar: string; en: string }> = {
  title: { ar: "الكاشير", en: "Cashier" },
  subtitle: {
    ar: "بيع مباشر عبر نقطة البيع. الصندوق المالي يبقى في عمليات الصندوق.",
    en: "Direct POS selling. Financial register work stays in Register Ops.",
  },
  terminal: { ar: "الجهاز", en: "Terminal" },
  selectTerminal: { ar: "اختر جهاز نقطة البيع", en: "Select a POS terminal" },
  noTerminal: {
    ar: "لا يوجد جهاز نقطة بيع نشط لهذا المطعم.",
    en: "No active POS terminal for this restaurant.",
  },
  createTerminal: { ar: "إنشاء جهاز نقطة بيع", en: "Create POS terminal" },
  activateTerminal: { ar: "تفعيل جهاز نقطة بيع", en: "Activate POS terminal" },
  terminalListDenied: {
    ar: "لا يمكن عرض الأجهزة. الكاشير يحتاج جهازًا محددًا وصلاحية POS_ACCESS.",
    en: "Terminals cannot be listed. Cashier needs a terminal and POS_ACCESS.",
  },
  accessDenied: {
    ar: "الدخول للوحة المطعم لا يمنح صلاحية الكاشير. يلزم POS_ACCESS وجهاز نشط.",
    en: "Dashboard access is not cashier access. POS_ACCESS and an active terminal are required.",
  },
  enableAccess: {
    ar: "تفعيل صلاحيات الكاشير لحسابي",
    en: "Enable cashier access for my account",
  },
  enableAccessHint: {
    ar: "يستخدم أمر المنح الحالي. ليس نظام الموظفين. لا يُفعَّل تلقائيًا.",
    en: "Uses the existing grant command. Not Staff Access. Not automatic.",
  },
  catalog: { ar: "القائمة", en: "Catalog" },
  allCategories: { ar: "الكل", en: "All" },
  category: { ar: "تصنيف", en: "Category" },
  unavailable: { ar: "غير متاح", en: "Unavailable" },
  ticket: { ar: "الطلب الحالي", en: "Current ticket" },
  ticketEmpty: { ar: "اختر أصنافًا من القائمة.", en: "Select items from the catalog." },
  qty: { ar: "الكمية", en: "Qty" },
  placeSale: { ar: "تأكيد البيع", en: "Place sale" },
  placing: { ar: "جاري الإنشاء…", en: "Placing…" },
  activeOrders: { ar: "الطلبات النشطة", en: "Active orders" },
  noOrders: { ar: "لا توجد طلبات نشطة.", en: "No active orders." },
  orderDetail: { ar: "تفاصيل الطلب", en: "Order detail" },
  timeline: { ar: "الخط الزمني", en: "Timeline" },
  settlement: { ar: "التسوية", en: "Settlement" },
  noSettlement: { ar: "لا توجد تسوية معروضة لهذا الطلب.", en: "No settlement projection for this order." },
  intakeCheck: { ar: "فتح شيك", en: "Open check" },
  initiateSettlement: { ar: "بدء التسوية", en: "Initiate settlement" },
  notes: { ar: "ملاحظات", en: "Notes" },
  modifiers: { ar: "إضافات", en: "Modifiers" },
  loading: { ar: "جاري التحميل…", en: "Loading…" },
  retry: { ar: "إعادة المحاولة", en: "Retry" },
  errorTitle: { ar: "تعذر تحميل الكاشير", en: "Cashier could not load" },
  emptyCatalog: { ar: "لا توجد أصناف متاحة.", en: "No available items." },
  salePlaced: { ar: "تم إنشاء الطلب", en: "Sale placed" },
  checkOpened: { ar: "تم فتح الشيك", en: "Check opened" },
  settlementStarted: { ar: "تم بدء التسوية", en: "Settlement initiated" },
  settlementGap: {
    ar: "التسوية المالية الكاملة قد تتطلب وردية صندوق مفتوحة من عمليات الصندوق.",
    en: "Full paid settlement may require an open register shift from Register Ops.",
  },
};

export function cashierUiLabel(key: keyof typeof COPY, language: CashierLang): string {
  return COPY[key][language];
}
