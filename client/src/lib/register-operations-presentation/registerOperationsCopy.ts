/**
 * REGISTER-OPERATIONS-UI-1 / UX-REFINEMENT-1 — operator-facing copy (ar/en).
 */

export type RegisterOperationsLang = "ar" | "en";

const COPY = {
  title: { ar: "عمليات الصندوق", en: "Register Operations" },
  subtitle: {
    ar: "إدارة واجب الصندوق والمشغّل والجهاز لهذا الفرع",
    en: "Manage register duty, operator, and device for this branch",
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
    ar: "إنشاء الصندوق غير متاح من هذه الشاشة حالياً. يتم تجهيز الصناديق عبر كتالوج التشغيل المعتمد.",
    en: "Creating a register is not available from this screen yet. Registers are provisioned through the certified catalog process.",
  },
  listEmptyGuidance: {
    ar: "لم يتم إنشاء أي صندوق تشغيل لهذا المطعم.",
    en: "No operating register has been created for this restaurant.",
  },
  listEmptyNext: {
    ar: "الخطوة التالية: تجهيز صندوق من الكتالوج التشغيلي المعتمد.",
    en: "Next: provision a register via the certified operational catalog.",
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
