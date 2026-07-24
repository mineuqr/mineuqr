/**
 * REGISTER-OPERATIONS-UI-1 — operator-facing copy (ar/en).
 */

export type RegisterOperationsLang = "ar" | "en";

const COPY = {
  title: { ar: "عمليات الصندوق", en: "Register Operations" },
  subtitle: {
    ar: "دورة الواجب والمشغّل والجهاز — دون حسابات مالية في الواجهة",
    en: "Duty, operator, and device — no financial math in the UI",
  },
  stationMode: { ar: "وضع المحطة", en: "Station mode" },
  availableRegisters: { ar: "الصناديق المتاحة", en: "Available registers" },
  noRegisters: {
    ar: "لا توجد صناديق في الكتالوج بعد",
    en: "No registers in the catalog yet",
  },
  selectRegister: { ar: "اختر صندوقاً", en: "Select a register" },
  refresh: { ar: "تحديث", en: "Refresh" },
  dutyStatus: { ar: "حالة الواجب", en: "Duty status" },
  catalogStatus: { ar: "حالة الكتالوج", en: "Catalog status" },
  currentOperator: { ar: "المشغّل الحالي", en: "Current operator" },
  currentDevice: { ar: "الجهاز الحالي", en: "Current device" },
  financialShift: { ar: "الوردية المالية", en: "Financial shift" },
  noShift: { ar: "لا توجد وردية نشطة", en: "No active financial shift" },
  availability: { ar: "التوفر", en: "Availability" },
  history: { ar: "سجل الورديات", en: "Shift history" },
  recovery: { ar: "الاستعادة", en: "Recovery" },
  resolveActive: { ar: "حل الصندوق النشط", en: "Resolve active register" },
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
  available_for_duty: { ar: "جاهز للواجب", en: "Ready for duty" },
  on_duty: { ar: "في الواجب", en: "On duty" },
  duty_paused: { ar: "واجب متوقف", en: "Duty paused" },
  not_available: { ar: "غير متاح", en: "Not available" },
  recoveryHint: {
    ar: "عند التعليق: استئناف الواجب أو تحديث الحالة. أغلق الصندوق فقط بعد إغلاق الوردية.",
    en: "If suspended: resume duty or refresh. Close register only after the financial shift is closed.",
  },
  details: { ar: "التفاصيل", en: "Details" },
  actions: { ar: "إجراءات", en: "Actions" },
  version: { ar: "الإصدار", en: "Version" },
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
