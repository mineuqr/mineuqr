/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * Merge Catalog localization keys into en.json / ar.json (idempotent).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const experienceTabs = {
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  wizard: { en: "Plan Wizard", ar: "معالج الخطة" },
  search: { en: "Search", ar: "بحث" },
  compare: { en: "Compare", ar: "مقارنة" },
  preview: { en: "Pricing Preview", ar: "معاينة التسعير" },
  customer_preview: { en: "Customer Preview", ar: "معاينة العميل" },
  graph: { en: "Dependencies", ar: "الاعتماديات" },
  timeline: { en: "Timeline", ar: "الجدول الزمني" },
  bulk: { en: "Bulk Ops", ar: "عمليات جماعية" },
  manage: { en: "Manage", ar: "إدارة" },
};

const manageSections = {
  plans: { en: "Plans", ar: "الخطط" },
  plan_versions: { en: "Plan Versions", ar: "إصدارات الخطط" },
  pricing: { en: "Pricing", ar: "التسعير" },
  billing_cycles: { en: "Billing Cycles", ar: "دورات الفوترة" },
  feature_bundles: { en: "Feature Bundles", ar: "حزم الميزات" },
  limit_profiles: { en: "Limit Profiles", ar: "ملفات الحدود" },
  regional_policies: { en: "Regional Policies", ar: "السياسات الإقليمية" },
  trial_policies: { en: "Trial Policies", ar: "سياسات التجربة" },
  promotions: { en: "Promotions", ar: "العروض" },
  migration_policies: { en: "Migration Policies", ar: "سياسات الترحيل" },
  retirement_policies: { en: "Retirement Policies", ar: "سياسات الإحالة للتقاعد" },
  publication_status: { en: "Publication", ar: "النشر" },
  commercial_health: { en: "Commercial Health", ar: "الصحة التجارية" },
  commercial_validation: { en: "Commercial Validation", ar: "التحقق التجاري" },
};

function pick(map, lang) {
  const out = {};
  for (const [k, v] of Object.entries(map)) out[k] = v[lang];
  return out;
}

function catalogBlock(lang) {
  const L = lang;
  return {
    experienceLive: L === "en" ? "Experience live" : "التجربة فعّالة",
    heroDescription:
      L === "en"
        ? "Enterprise Commercial Catalog workspace — wizard, smart validation, clone, compare, previews, bulk ops, and search. Domain rules unchanged."
        : "مساحة كتالوج تجاري للمؤسسات — معالج، تحقق ذكي، استنساخ، مقارنة، معاينات، عمليات جماعية وبحث. قواعد المجال دون تغيير.",
    experience: {
      tabs: pick(experienceTabs, L),
    },
    manage: {
      sections: pick(manageSections, L),
      createPlan: L === "en" ? "Create Plan" : "إنشاء خطة",
      editPlan: L === "en" ? "Edit Plan" : "تعديل الخطة",
      createVersion: L === "en" ? "Create Version" : "إنشاء إصدار",
      createPrice: L === "en" ? "Create Price" : "إنشاء سعر",
      createCycle: L === "en" ? "Create Cycle" : "إنشاء دورة",
      createBundle: L === "en" ? "Create Bundle" : "إنشاء حزمة",
      createProfile: L === "en" ? "Create Profile" : "إنشاء ملف حدود",
      createRegion: L === "en" ? "Create Region" : "إنشاء منطقة",
      create: L === "en" ? "Create" : "إنشاء",
      edit: L === "en" ? "Edit" : "تعديل",
      archive: L === "en" ? "Archive" : "أرشفة",
      clone: L === "en" ? "Clone" : "استنساخ",
      publish: L === "en" ? "Publish" : "نشر",
      save: L === "en" ? "Save" : "حفظ",
      cancel: L === "en" ? "Cancel" : "إلغاء",
      search: L === "en" ? "Search…" : "بحث…",
      currencyUsdOnly:
        L === "en"
          ? "Canonical currency (USD only)"
          : "العملة المعيارية (دولار أمريكي فقط)",
      noPlans: L === "en" ? "No plans" : "لا توجد خطط",
      noPlansBody:
        L === "en"
          ? "Create the first Commercial Plan Identity."
          : "أنشئ أول هوية خطة تجارية.",
      noVersions: L === "en" ? "No versions" : "لا توجد إصدارات",
      noVersionsBody:
        L === "en"
          ? "Create a draft Plan Version for a plan."
          : "أنشئ إصدار خطة مسودة لخطة.",
      plansTitle: L === "en" ? "Plans" : "الخطط",
      plansBody:
        L === "en"
          ? "Create and manage Commercial Plan Identities. Archive hides a plan from selection; hard delete is not supported for historical identity integrity."
          : "إنشاء وإدارة هويات الخطط التجارية. الأرشفة تخفي الخطة من الاختيار؛ الحذف النهائي غير مدعوم لسلامة الهوية التاريخية.",
      versionsTitle: L === "en" ? "Plan Versions" : "إصدارات الخطط",
      versionsBody:
        L === "en"
          ? "Draft → Publish → Deprecate → Retire. Clone creates a new draft from an existing version."
          : "مسودة → نشر → إيقاف → تقاعد. الاستنساخ ينشئ مسودة جديدة من إصدار قائم.",
      pricingTitle: L === "en" ? "Pricing" : "التسعير",
      pricingBody:
        L === "en"
          ? "Canonical prices are USD. Attach a region to create a local presentation override."
          : "الأسعار المعيارية بالدولار. اربط منطقة لإنشاء تجاوز عرض محلي.",
    },
    money: {
      canonicalUsd: L === "en" ? "USD" : "دولار أمريكي",
      localCurrency: L === "en" ? "Local Currency" : "العملة المحلية",
      sourceRegional:
        L === "en" ? "Price source: Regional Price" : "مصدر السعر: سعر إقليمي",
      sourceFx:
        L === "en"
          ? "Price source: Converted from USD"
          : "مصدر السعر: محوّل من الدولار",
      sourceUsd: L === "en" ? "Price source: USD" : "مصدر السعر: دولار أمريكي",
      adminPreviewTitle:
        L === "en" ? "Localized Preview" : "معاينة موضعية",
      adminPreviewBody:
        L === "en"
          ? "Read-only market preview. Never modifies stored commercial data."
          : "معاينة أسواق للقراءة فقط. لا تعدّل البيانات التجارية المخزّنة.",
      previewReadOnly:
        L === "en"
          ? "Preview is read-only. Admins edit USD only."
          : "المعاينة للقراءة فقط. يعدّل المسؤولون الدولار فقط.",
      previewEmpty:
        L === "en"
          ? "Add a USD price to preview localized markets."
          : "أضف سعراً بالدولار لمعاينة الأسواق الموضعية.",
    },
    markets: {
      sa: L === "en" ? "Saudi Arabia" : "المملكة العربية السعودية",
      de: L === "en" ? "Germany" : "ألمانيا",
      us: L === "en" ? "United States" : "الولايات المتحدة",
      jp: L === "en" ? "Japan" : "اليابان",
      gb: L === "en" ? "United Kingdom" : "المملكة المتحدة",
    },
    preview: {
      pricingTitle:
        L === "en" ? "Public Pricing Preview" : "معاينة التسعير العامة",
      pricingBody:
        L === "en"
          ? "Draft-aware customer pricing with dual USD + local display."
          : "تسعير عميل مع عرض مزدوج دولار + محلي (يشمل المسودات).",
      customerTitle: L === "en" ? "Customer Preview" : "معاينة العميل",
      customerBody:
        L === "en"
          ? "Preview as a customer in a selected country. Manual country override."
          : "معاينة كعميل في بلد محدد. تجاوز يدوي للبلد.",
      selectVersion:
        L === "en" ? "Select version (draft OK)" : "اختر إصداراً (المسودة مسموحة)",
      monthly: L === "en" ? "Monthly" : "شهري",
      yearly: L === "en" ? "Annual" : "سنوي",
      selectToPreview:
        L === "en" ? "Select a version to preview." : "اختر إصداراً للمعاينة.",
      countryOverride:
        L === "en" ? "Country override" : "تجاوز البلد",
    },
    publicPricing: {
      dualTitle: L === "en" ? "Localized pricing" : "تسعير موضعي",
      detectedCountry: L === "en" ? "Detected country" : "البلد المكتشف",
      regionalAvailability:
        L === "en" ? "Regional availability" : "التوفر الإقليمي",
    },
    seo: {
      pricingTitle:
        L === "en"
          ? "Pricing — MineuQR Commercial Plans"
          : "الأسعار — خطط MineuQR التجارية",
      pricingDescription:
        L === "en"
          ? "Compare MineuQR plans. Prices shown in USD and your local currency."
          : "قارن خطط MineuQR. الأسعار بالدولار وعملتك المحلية.",
    },
    bulk: {
      title: L === "en" ? "Bulk Operations" : "عمليات جماعية",
      body:
        L === "en"
          ? "Multi-select versions. Validate before publish. Partial failures are reported."
          : "تحديد إصدارات متعددة. تحقق قبل النشر. يُبلَّغ عن الإخفاقات الجزئية.",
      publish: L === "en" ? "Bulk Publish" : "نشر جماعي",
      deprecate: L === "en" ? "Bulk Deprecate" : "إيقاف جماعي",
      retire: L === "en" ? "Bulk Retire" : "تقاعد جماعي",
      archivePlans:
        L === "en" ? "Archive related plans" : "أرشفة الخطط المرتبطة",
    },
    compare: {
      title: L === "en" ? "Version Comparison" : "مقارنة الإصدارات",
      deepClone: L === "en" ? "Deep Clone" : "استنساخ عميق",
      left: L === "en" ? "Left version" : "الإصدار الأيسر",
      right: L === "en" ? "Right version" : "الإصدار الأيمن",
    },
    wizard: {
      title: L === "en" ? "Plan Creation Wizard" : "معالج إنشاء الخطة",
      body:
        L === "en"
          ? "Guided draft → review → CC-16 publish. Autosaves locally. Always runs validation before publish."
          : "مسودة موجّهة → مراجعة → نشر CC-16. حفظ تلقائي محلي. يتحقق دائماً قبل النشر.",
      back: L === "en" ? "Back" : "رجوع",
      next: L === "en" ? "Next" : "التالي",
      reset: L === "en" ? "Reset" : "إعادة تعيين",
    },
  };
}

function merge(lang) {
  const path = resolve(root, `client/src/locales/${lang}.json`);
  const json = JSON.parse(readFileSync(path, "utf8"));
  const cc = json.admin.platformOps.commercialCatalog;
  const block = catalogBlock(lang);
  json.admin.platformOps.commercialCatalog = {
    ...cc,
    ...block,
    section: {
      ...cc.section,
      ...Object.fromEntries(
        Object.entries(manageSections).map(([k, v]) => [
          k,
          lang === "en" ? v.en : v.ar,
        ])
      ),
    },
  };
  // public pricing SEO helpers
  json.pricing = {
    ...json.pricing,
    localizedMetaTitle: block.seo.pricingTitle,
    localizedMetaDescription: block.seo.pricingDescription,
    dualCurrencyNote:
      lang === "en"
        ? "USD is the canonical price. Local currency is shown for convenience."
        : "الدولار هو السعر المعياري. تُعرض العملة المحلية للتسهيل.",
  };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log("merged", lang);
}

merge("en");
merge("ar");
