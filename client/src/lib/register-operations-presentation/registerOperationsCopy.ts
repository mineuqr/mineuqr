/**
 * REGISTER-OPERATIONS-UI-1 / UX-REFINEMENT-1 /
 * REGISTER-OPERATIONS-SIMPLIFICATION-1 — operator-facing copy (ar/en).
 */

export type RegisterOperationsLang = "ar" | "en";

const COPY = {
  title: { ar: "عمليات الصندوق", en: "Register Operations" },
  subtitle: {
    ar: "فتح وإغلاق صندوق التشغيل لهذا الفرع",
    en: "Open and close the operating register for this branch",
  },
  registerLabel: { ar: "الصندوق", en: "Register" },
  mainRegister: { ar: "الصندوق الرئيسي", en: "Main register" },
  registerStatus: { ar: "حالة الصندوق", en: "Register status" },
  currentShift: { ar: "الوردية المالية", en: "Financial shift" },
  financialShiftSection: {
    ar: "الوردية المالية",
    en: "Financial shift",
  },
  registerSection: { ar: "الصندوق", en: "Register" },
  cashDrawerSection: { ar: "درج النقد", en: "Cash drawer" },
  tenderSummarySection: {
    ar: "ملخص وسائل الدفع",
    en: "Payment methods summary",
  },
  expectedCashInDrawer: {
    ar: "النقد المتوقع داخل الدرج",
    en: "Expected cash in drawer",
  },
  actualCashInDrawer: {
    ar: "النقد الفعلي داخل الدرج",
    en: "Actual cash in drawer",
  },
  cashDifference: { ar: "الفرق", en: "Difference" },
  shiftStatus: { ar: "حالة الوردية", en: "Shift status" },
  totalSalesTenders: {
    ar: "إجمالي المبيعات",
    en: "Total sales (tenders)",
  },
  cashSales: { ar: "نقد", en: "Cash" },
  tenderNetworkBank: { ar: "شبكة / بنك", en: "Network / Bank" },
  tenderComplimentary: { ar: "ضيافة", en: "Hospitality" },
  tenderRefund: { ar: "مرتجع", en: "Refund" },
  tenderSummaryEmpty: {
    ar: "لا توجد تسويات منسوبة لهذه الوردية بعد.",
    en: "No attributed settlements on this shift yet.",
  },
  tenderSummaryHint: {
    ar: "ملخص طرق الدفع للتسويات المنسوبة للوردية. لا يغيّر النقد المتوقع داخل الدرج.",
    en: "Payment methods for settlements attributed to this shift. Does not change expected drawer cash.",
  },
  currentUser: { ar: "المستخدم الحالي", en: "Current user" },
  thisDevice: { ar: "هذا الجهاز", en: "This device" },
  currentDeviceBound: { ar: "الجهاز الحالي", en: "Current device" },
  operatorFollowsCurrentUser: {
    ar: "يعتمد على المستخدم الحالي",
    en: "Follows the current user",
  },
  operatorAssignedOther: {
    ar: "مشغّل معيّن",
    en: "Assigned operator",
  },
  operatorAssignedOtherHint: {
    ar: "تم التعيين لمستخدم آخر",
    en: "Assigned to another user",
  },
  currentUserFallback: { ar: "المستخدم", en: "User" },
  roleAdmin: { ar: "مسؤول", en: "Admin" },
  roleManager: { ar: "مدير", en: "Manager" },
  roleUser: { ar: "مستخدم", en: "User" },
  noActiveRegisterTitle: {
    ar: "لا يوجد صندوق نشط",
    en: "No active register",
  },
  noActiveRegisterSubtitle: {
    ar: "قم بتفعيل صندوق من كتالوج الصناديق.",
    en: "Activate a register from the Register Catalog.",
  },
  openCatalogActivate: {
    ar: "فتح كتالوج الصناديق",
    en: "Open Register Catalog",
  },
  catalogActivateHint: {
    ar: "يجب تفعيل الصندوق من الكتالوج قبل فتحه.",
    en: "Activate the register in the catalog before opening duty.",
  },
  openDisabledHint: {
    ar: "الصندوق غير جاهز للفتح حتى يتم تفعيله من الكتالوج.",
    en: "Register cannot open until it is activated in the catalog.",
  },
  stationMode: { ar: "وضع المحطة", en: "Station mode" },
  stationModeHint: {
    ar: "واجهة محسّنة للأجهزة اللوحية ونقاط البيع.",
    en: "Optimized interface for tablets and point-of-sale stations.",
  },
  availableRegisters: { ar: "الصناديق", en: "Registers" },
  searchRegisters: { ar: "بحث عن صندوق…", en: "Search registers…" },
  emptyTitle: {
    ar: "لا يوجد أي صندوق تشغيل",
    en: "No operating registers yet",
  },
  emptySubtitle: {
    ar: "ابدأ بإنشاء أول صندوق تشغيل لهذا الفرع.",
    en: "Start by creating the first operating register for this branch.",
  },
  createRegister: { ar: "إنشاء صندوق", en: "Create register" },
  createRegisterDisabledHint: {
    ar: "لا تملك صلاحية إنشاء صندوق لهذا الفرع.",
    en: "You do not have permission to create a register for this branch.",
  },
  createRegisterHint: {
    ar: "سيتم فتح كتالوج الصناديق لإنشاء صندوق جديد.",
    en: "Opens Register Catalog to create a new register.",
  },
  listEmptyGuidance: {
    ar: "لم يتم إنشاء أي صندوق تشغيل لهذا المطعم.",
    en: "No operating register has been created for this restaurant.",
  },
  listEmptyNext: {
    ar: "التالي: أنشئ صندوقاً من كتالوج الصناديق.",
    en: "Next: create a register from Register Catalog.",
  },
  selectRegister: { ar: "اختر صندوقاً", en: "Select a register" },
  selectRegisterHint: {
    ar: "اضغط لاختيار صندوق من القائمة",
    en: "Tap to choose a register from the list",
  },
  refresh: { ar: "تحديث", en: "Refresh" },
  dutyStatus: { ar: "حالة الواجب", en: "Duty status" },
  catalogStatus: { ar: "حالة الكتالوج", en: "Catalog status" },
  currentOperator: { ar: "المشغّل", en: "Operator" },
  currentDevice: { ar: "الجهاز", en: "Device" },
  financialShift: { ar: "الوردية", en: "Shift" },
  shiftActive: { ar: "وردية نشطة", en: "Shift active" },
  noShift: { ar: "لا توجد وردية", en: "No shift" },
  availability: { ar: "التوفر", en: "Availability" },
  ready: { ar: "جاهز", en: "Ready" },
  unavailable: { ar: "غير متاح", en: "Unavailable" },
  history: { ar: "سجل الورديات", en: "Shift history" },
  recovery: { ar: "الاستعادة", en: "Recovery" },
  resolveActive: { ar: "الصندوق النشط", en: "Active register" },
  open: { ar: "فتح الصندوق", en: "Open register" },
  close: { ar: "إغلاق الصندوق", en: "Close register" },
  suspend: { ar: "تعليق", en: "Suspend" },
  resume: { ar: "استئناف", en: "Resume" },
  assignOperator: { ar: "تعيين مشغّل", en: "Assign operator" },
  releaseOperator: { ar: "تحرير المشغّل", en: "Release operator" },
  reassignOperator: { ar: "إعادة تعيين", en: "Reassign" },
  attachDevice: { ar: "ربط جهاز", en: "Attach device" },
  detachDevice: { ar: "فصل الجهاز", en: "Detach device" },
  replaceDevice: { ar: "استبدال الجهاز", en: "Replace device" },
  operatorUserId: { ar: "معرّف المشغّل", en: "Operator user ID" },
  deviceId: { ar: "معرّف الجهاز", en: "Device ID" },
  none: { ar: "—", en: "—" },
  loading: { ar: "جاري التحميل…", en: "Loading…" },
  syncing: { ar: "مزامنة…", en: "Syncing…" },
  retry: { ar: "إعادة المحاولة", en: "Retry" },
  alreadyApplied: { ar: "مطبّق مسبقاً", en: "Already applied" },
  success: { ar: "تم بنجاح", en: "Success" },
  duty_closed: { ar: "مغلق", en: "Closed" },
  duty_open: { ar: "مفتوح", en: "Open" },
  duty_suspended: { ar: "معلّق", en: "Suspended" },
  catalog_provisioned: { ar: "مجهّز", en: "Provisioned" },
  catalog_active: { ar: "نشط", en: "Active" },
  catalog_inactive: { ar: "غير نشط", en: "Inactive" },
  recoveryHint: {
    ar: "عند التعليق: استئناف الواجب أو تحديث الحالة. أغلق الصندوق فقط بعد إغلاق الوردية.",
    en: "If suspended: resume duty or refresh. Close register only after the financial shift is closed.",
  },
  details: { ar: "التفاصيل", en: "Details" },
  actions: { ar: "إجراءات", en: "Actions" },
  primaryActions: { ar: "إجراء أساسي", en: "Primary action" },
  contextualActions: { ar: "إجراءات سياقية", en: "Contextual actions" },
  version: { ar: "الإصدار", en: "Version" },
  noResults: { ar: "لا نتائج للبحث", en: "No matching registers" },
  openingFloatTitle: {
    ar: "العهدة الافتتاحية",
    en: "Opening float",
  },
  openingFloatSubtitle: {
    ar: "أدخل مبلغ العهدة لفتح الوردية المالية قبل متابعة المبيعات.",
    en: "Enter the opening float to open the financial shift before sales continue.",
  },
  openingFloatAmount: {
    ar: "مبلغ العهدة",
    en: "Opening float amount",
  },
  openingFloatRequired: {
    ar: "مبلغ العهدة مطلوب.",
    en: "Opening float amount is required.",
  },
  openingFloatInvalid: {
    ar: "أدخل مبلغاً صالحاً (رقمان عشريان كحد أقصى).",
    en: "Enter a valid amount (up to 2 decimal places).",
  },
  openingFloatConfirm: {
    ar: "فتح الوردية",
    en: "Open shift",
  },
  openingFloatCancelCloseDuty: {
    ar: "إغلاق الصندوق بدون وردية",
    en: "Close register without shift",
  },
  cashCountTitle: {
    ar: "ملخص إغلاق الوردية",
    en: "Shift closing summary",
  },
  cashCountSubtitle: {
    ar: "راجع ملخص الوردية وأدخل النقد الفعلي قبل الإغلاق.",
    en: "Review the shift summary and enter actual cash before closing.",
  },
  closingReportTitle: {
    ar: "تقرير إغلاق الوردية",
    en: "Shift closing report",
  },
  closingReportNotInvoice: {
    ar: "ملخص تشغيلي — ليس فاتورة ضريبية",
    en: "Operational summary — not a fiscal invoice",
  },
  closingShiftNumber: {
    ar: "رقم الوردية",
    en: "Shift number",
  },
  closedAt: {
    ar: "وقت الإغلاق",
    en: "Closed at",
  },
  shiftDuration: {
    ar: "مدة الوردية",
    en: "Shift duration",
  },
  printClosingReport: {
    ar: "طباعة تقرير الإغلاق",
    en: "Print closing report",
  },
  autoPrintClosingReport: {
    ar: "طباعة تلقائية بعد الإغلاق",
    en: "Auto-print after close",
  },
  ordersCount: {
    ar: "عدد الطلبات",
    en: "Orders count",
  },
  settlementsCount: {
    ar: "عدد التسويات",
    en: "Settlements count",
  },
  generatedAt: {
    ar: "وقت الإنشاء",
    en: "Generated at",
  },
  closingTenderSection: {
    ar: "ملخص وسائل الدفع",
    en: "Payment methods summary",
  },
  closingDrawerSection: {
    ar: "درج النقد",
    en: "Cash drawer",
  },
  cashCountActual: {
    ar: "النقد الفعلي",
    en: "Actual cash",
  },
  cashCountExpected: {
    ar: "النقد المتوقع داخل الدرج",
    en: "Expected cash in drawer",
  },
  cashCountDifference: {
    ar: "الفرق",
    en: "Difference",
  },
  cashCountConfirm: {
    ar: "إغلاق الوردية والصندوق",
    en: "Close shift and register",
  },
  cashCountCancel: {
    ar: "إلغاء",
    en: "Cancel",
  },
  currentCashSummary: {
    ar: "درج النقد",
    en: "Cash drawer",
  },
  openedAt: {
    ar: "وقت الفتح",
    en: "Opened at",
  },
  shiftOpenSuccess: {
    ar: "تم فتح الوردية المالية.",
    en: "Financial shift opened.",
  },
  shiftCloseSuccess: {
    ar: "تم إغلاق الوردية المالية.",
    en: "Financial shift closed.",
  },
} as const;

export type RegisterOperationsCopyKey = keyof typeof COPY;

export function registerOperationsUiLabel(
  key: RegisterOperationsCopyKey,
  language: RegisterOperationsLang
): string {
  return COPY[key][language];
}

export function dutyStatusLabel(
  duty: "closed" | "open" | "suspended",
  language: RegisterOperationsLang
): string {
  return registerOperationsUiLabel(`duty_${duty}`, language);
}

export function catalogStatusLabel(
  status: "provisioned" | "active" | "inactive",
  language: RegisterOperationsLang
): string {
  return registerOperationsUiLabel(`catalog_${status}`, language);
}
