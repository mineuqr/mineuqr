/**
 * REGISTER-CATALOG-MANAGEMENT-1 — presentation copy only.
 */

export type CatalogLanguage = "ar" | "en";

const COPY = {
  title: { ar: "كتالوج الصناديق", en: "Register Catalog" },
  subtitle: {
    ar: "تجهيز وتفعيل صناديق التشغيل قبل فتح الوردية التشغيلية",
    en: "Provision and activate registers before opening duty",
  },
  search: { ar: "بحث…", en: "Search…" },
  create: { ar: "إنشاء صندوق", en: "Create register" },
  edit: { ar: "تعديل", en: "Edit" },
  activate: { ar: "تفعيل", en: "Activate" },
  deactivate: { ar: "إلغاء التفعيل", en: "Deactivate" },
  archive: { ar: "أرشفة", en: "Archive" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  code: { ar: "الرمز", en: "Code" },
  displayName: { ar: "الاسم المعروض", en: "Display name" },
  registerType: { ar: "النوع", en: "Type" },
  catalogStatus: { ar: "حالة الكتالوج", en: "Catalog status" },
  openOperations: { ar: "عمليات الصندوق", en: "Register Operations" },
  emptyTitle: { ar: "لا توجد صناديق بعد", en: "No registers yet" },
  emptySubtitle: {
    ar: "أنشئ أول صندوق تشغيل لهذا الفرع.",
    en: "Create the first operating register for this branch.",
  },
  filterAll: { ar: "الكل", en: "All" },
  filterActive: { ar: "نشط", en: "Active" },
  filterProvisioned: { ar: "مجهّز", en: "Provisioned" },
  filterInactive: { ar: "غير نشط", en: "Inactive" },
  type_settlement_station: {
    ar: "محطة تسوية",
    en: "Settlement station",
  },
  type_counter: { ar: "كاونتر", en: "Counter" },
  type_mobile_pos: { ar: "نقطة بيع متنقلة", en: "Mobile POS" },
  catalog_provisioned: { ar: "مجهّز", en: "Provisioned" },
  catalog_active: { ar: "نشط", en: "Active" },
  catalog_inactive: { ar: "غير نشط", en: "Inactive" },
  archived: { ar: "مؤرشف", en: "Archived" },
  loading: { ar: "جاري التحميل…", en: "Loading…" },
  retry: { ar: "إعادة المحاولة", en: "Retry" },
  noResults: { ar: "لا نتائج", en: "No results" },
  createDialogTitle: { ar: "إنشاء صندوق", en: "Create register" },
  editDialogTitle: { ar: "تعديل الصندوق", en: "Edit register" },
  dutyHint: {
    ar: "إدارة الوردية التشغيلية تتم من شاشة عمليات الصندوق.",
    en: "Duty controls live on the Register Operations screen.",
  },
  forbiddenCreate: {
    ar: "لا تملك صلاحية إنشاء صندوق لهذا الفرع.",
    en: "You do not have permission to create a register for this branch.",
  },
} as const;

export type RegisterCatalogCopyKey = keyof typeof COPY;

export function registerCatalogUiLabel(
  key: RegisterCatalogCopyKey,
  language: CatalogLanguage
): string {
  return COPY[key][language];
}

export function catalogStatusLabel(
  status: "provisioned" | "active" | "inactive",
  language: CatalogLanguage
): string {
  return registerCatalogUiLabel(`catalog_${status}`, language);
}

export function registerTypeLabel(
  type: "settlement_station" | "counter" | "mobile_pos",
  language: CatalogLanguage
): string {
  return registerCatalogUiLabel(`type_${type}`, language);
}
