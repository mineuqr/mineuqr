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
  unknownCategory: { ar: "بدون تصنيف", en: "Uncategorized" },
  unavailable: { ar: "غير متاح", en: "Unavailable" },
  ticket: { ar: "الطلب الحالي", en: "Current ticket" },
  ticketEmpty: { ar: "اختر أصنافًا من القائمة.", en: "Select items from the catalog." },
  ticketTotal: { ar: "إجمالي التذكرة", en: "Ticket total" },
  qty: { ar: "الكمية", en: "Qty" },
  placeSale: { ar: "تأكيد البيع", en: "Place sale" },
  placing: { ar: "جاري الإنشاء…", en: "Placing…" },
  activeOrders: { ar: "الطلبات النشطة", en: "Active orders" },
  noOrders: { ar: "لا توجد طلبات نشطة.", en: "No active orders." },
  orderDetail: { ar: "تفاصيل الطلب", en: "Order detail" },
  orderCreated: { ar: "الطلب", en: "Order" },
  timeline: { ar: "الخط الزمني", en: "Timeline" },
  checkout: { ar: "الدفع", en: "Checkout" },
  checkLabel: { ar: "الشيك", en: "Check" },
  checkOpenedResult: { ar: "الشيك مفتوح", en: "Check is open" },
  checkMissing: {
    ar: "افتح الشيك لعرض المبلغ المستحق قبل الدفع.",
    en: "Open the check to show the amount due before payment.",
  },
  amountDue: { ar: "المبلغ المستحق", en: "Amount due" },
  orderTotalHint: {
    ar: "إجمالي الطلب حتى يظهر مبلغ الشيك.",
    en: "Order total until the Check amount is available.",
  },
  selectPaymentMethod: { ar: "اختر طريقة الدفع", en: "Select payment method" },
  paymentMethod: { ar: "طريقة الدفع", en: "Payment method" },
  completePayment: { ar: "إتمام الدفع", en: "Complete payment" },
  paying: { ar: "جاري الدفع…", en: "Paying…" },
  paidTitle: { ar: "تم الدفع", en: "Payment successful" },
  paidBody: {
    ar: "الشيك مدفوع. يمكنك بدء بيع جديد.",
    en: "The check is paid. You can start a new sale.",
  },
  afterPayment: {
    ar: "التقارير تقرأ الشيك المدفوع. لا يُحسب إيراد منفصل للكاشير.",
    en: "Reporting reads the paid Check. Cashier does not store a separate revenue total.",
  },
  newSale: { ar: "بيع جديد", en: "New sale" },
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
  settlementStarted: { ar: "تم دفع الشيك", en: "Check paid" },
  settlementGap: {
    ar: "التسوية المالية الكاملة قد تتطلب وردية صندوق مفتوحة من عمليات الصندوق.",
    en: "Full paid settlement may require an open register shift from Register Ops.",
  },
  shiftRequired: {
    ar: "لا يمكن إتمام الدفع بدون وردية مالية مفتوحة. افتح الوردية من عمليات الصندوق ثم عد إلى الكاشير.",
    en: "Payment cannot complete without an open financial shift. Open the shift in Register Ops, then return to Cashier.",
  },
  registerRequired: {
    ar: "لا يمكن إتمام الدفع بدون صندوق مفتوح. الصندوق يبقى في عمليات الصندوق.",
    en: "Payment cannot complete without an open register. Register work stays in Register Ops.",
  },
  registerClosed: {
    ar: "الصندوق غير مفتوح. افتح الصندوق من عمليات الصندوق ثم أتمم الدفع هنا.",
    en: "The register is not open. Open it in Register Ops, then complete payment here.",
  },
  openRegisterOps: { ar: "فتح عمليات الصندوق", en: "Open Register Ops" },
  returnDashboard: { ar: "العودة إلى لوحة التحكم", en: "Return to Dashboard" },
  openNewTab: { ar: "فتح الكاشير في تبويب جديد", en: "Open Cashier in a new tab" },
  newTabBlocked: {
    ar: "تعذر فتح تبويب جديد. استخدم الكاشير في هذه النافذة.",
    en: "A new tab could not be opened. Continue in this window.",
  },
  statusReady: { ar: "جاهز", en: "Ready" },
  statusShift: { ar: "يلزم وردية الصندوق", en: "Register shift required" },
  ticketSubtotal: { ar: "المجموع الفرعي", en: "Subtotal" },
  ticketTax: { ar: "الضريبة", en: "Tax" },
  removeLine: { ar: "حذف الصنف", en: "Remove item" },
  completePaymentTitle: { ar: "إتمام الدفع", en: "Complete payment" },
  amountReceived: { ar: "المبلغ المدفوع", en: "Amount received" },
  changeDue: { ar: "الباقي", en: "Change" },
  confirmPayment: { ar: "تأكيد الدفع", en: "Confirm payment" },
  paidSuccess: { ar: "تم الدفع بنجاح", en: "Payment successful" },
  printInvoice: { ar: "طباعة الفاتورة", en: "Print invoice" },
  printUnavailable: {
    ar: "الفاتورة تطبع من سجل التسوية بعد نجاح الدفع. إن لم يظهر رقم التسوية، استخدم مساحة التسويات.",
    en: "The invoice prints from the Settlement Record after payment. If no settlement id is available, use Settlements.",
  },
  shiftBeforePay: {
    ar: "يجب فتح وردية الصندوق قبل إتمام الدفع",
    en: "Open a register shift before completing payment",
  },
  cashInsufficient: {
    ar: "المبلغ المدفوع أقل من المستحق.",
    en: "Amount received is less than the amount due.",
  },
  orderNumber: { ar: "رقم الطلب", en: "Order number" },
  invoiceNumber: { ar: "رقم الشيك", en: "Check number" },
  preparingCheck: { ar: "جاري تجهيز الشيك…", en: "Preparing check…" },
  showActiveOrders: { ar: "الطلبات النشطة", en: "Active orders" },
  hideActiveOrders: { ar: "إخفاء الطلبات النشطة", en: "Hide active orders" },
  cancelPayment: { ar: "إلغاء", en: "Cancel" },
};

export function cashierUiLabel(key: keyof typeof COPY, language: CashierLang): string {
  return COPY[key][language];
}
