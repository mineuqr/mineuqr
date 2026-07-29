/**
 * COMMERCIAL-CATALOG-PRODUCTION-POLISH-1 — merge feature/limit/polish locale keys.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FEATURES = {
  qrMenu: {
    en: { name: "QR Menu", description: "Digital QR menu for guests", tooltip: "Guests scan to open the menu", category: "Menu", keywords: "qr menu digital" },
    ar: { name: "منيو QR", description: "منيو رقمي عبر رمز QR للضيوف", tooltip: "يفتح الضيوف المنيو بالمسح", category: "المنيو", keywords: "منيو qr" },
  },
  categories: {
    en: { name: "Categories", description: "Organize menu categories", tooltip: "Structure your menu", category: "Menu", keywords: "categories" },
    ar: { name: "الفئات", description: "تنظيم فئات المنيو", tooltip: "هيكلة المنيو", category: "المنيو", keywords: "فئات" },
  },
  menuImages: {
    en: { name: "Menu Images", description: "Show images on menu items", tooltip: "Visual menu items", category: "Menu", keywords: "images photos" },
    ar: { name: "صور المنيو", description: "عرض صور الأصناف", tooltip: "أصناف مرئية", category: "المنيو", keywords: "صور" },
  },
  search: {
    en: { name: "Search", description: "Guest menu search", tooltip: "Find items quickly", category: "Menu", keywords: "search" },
    ar: { name: "البحث", description: "بحث الضيوف في المنيو", tooltip: "العثور على الأصناف بسرعة", category: "المنيو", keywords: "بحث" },
  },
  ordering: {
    en: { name: "Ordering", description: "In-venue ordering", tooltip: "Place orders from the menu", category: "Ordering", keywords: "order" },
    ar: { name: "الطلب", description: "الطلب داخل المكان", tooltip: "اطلب من المنيو", category: "الطلبات", keywords: "طلب" },
  },
  cart: {
    en: { name: "Cart", description: "Guest shopping cart", tooltip: "Collect items before checkout", category: "Ordering", keywords: "cart" },
    ar: { name: "السلة", description: "سلة تسوق الضيف", tooltip: "جمع الأصناف قبل الإتمام", category: "الطلبات", keywords: "سلة" },
  },
  checkout: {
    en: { name: "Checkout", description: "Complete guest orders", tooltip: "Finalize the order", category: "Ordering", keywords: "checkout" },
    ar: { name: "إتمام الطلب", description: "إكمال طلبات الضيوف", tooltip: "إنهاء الطلب", category: "الطلبات", keywords: "إتمام" },
  },
  requestBill: {
    en: { name: "Request Bill", description: "Guests request the bill", tooltip: "Bill request from table", category: "Service", keywords: "bill" },
    ar: { name: "طلب الفاتورة", description: "طلب الفاتورة من الضيف", tooltip: "طلب فاتورة من الطاولة", category: "الخدمة", keywords: "فاتورة" },
  },
  callWaiter: {
    en: { name: "Call Waiter", description: "Guests call staff", tooltip: "Assistance at the table", category: "Service", keywords: "waiter" },
    ar: { name: "استدعاء النادل", description: "استدعاء الموظفين", tooltip: "مساعدة على الطاولة", category: "الخدمة", keywords: "نادل" },
  },
  orderTracking: {
    en: { name: "Order Tracking", description: "Track order status", tooltip: "Live order progress", category: "Ordering", keywords: "tracking" },
    ar: { name: "تتبع الطلب", description: "تتبع حالة الطلب", tooltip: "تقدم الطلب مباشرة", category: "الطلبات", keywords: "تتبع" },
  },
  reports: {
    en: { name: "Reports", description: "Operational reports", tooltip: "Business insights", category: "Analytics", keywords: "reports" },
    ar: { name: "التقارير", description: "تقارير تشغيلية", tooltip: "رؤى الأعمال", category: "التحليلات", keywords: "تقارير" },
  },
  excelExport: {
    en: { name: "Excel Export", description: "Export data to Excel", tooltip: "Spreadsheet export", category: "Analytics", keywords: "excel export" },
    ar: { name: "تصدير Excel", description: "تصدير البيانات إلى Excel", tooltip: "تصدير جداول", category: "التحليلات", keywords: "excel" },
  },
  hotelMode: {
    en: { name: "Hotel Mode", description: "Hotel room service mode", tooltip: "Hospitality workflows", category: "Hospitality", keywords: "hotel" },
    ar: { name: "وضع الفندق", description: "وضع خدمة الغرف", tooltip: "عمليات الضيافة", category: "الضيافة", keywords: "فندق" },
  },
  roomQr: {
    en: { name: "Room QR", description: "Per-room QR codes", tooltip: "Room-level access", category: "Hospitality", keywords: "room qr" },
    ar: { name: "QR الغرف", description: "رموز QR لكل غرفة", tooltip: "وصول على مستوى الغرفة", category: "الضيافة", keywords: "غرفة" },
  },
  dynamicServiceCatalog: {
    en: { name: "Dynamic Offers", description: "Dynamic service catalog", tooltip: "Flexible offers", category: "Hospitality", keywords: "offers" },
    ar: { name: "العروض الديناميكية", description: "كتالوج خدمات ديناميكي", tooltip: "عروض مرنة", category: "الضيافة", keywords: "عروض" },
  },
  templates: {
    en: { name: "Templates", description: "Menu templates", tooltip: "Start faster", category: "Branding", keywords: "templates" },
    ar: { name: "القوالب", description: "قوالب المنيو", tooltip: "ابدأ أسرع", category: "الهوية", keywords: "قوالب" },
  },
  customColors: {
    en: { name: "Custom Colors", description: "Brand color customization", tooltip: "Match your brand", category: "Branding", keywords: "colors" },
    ar: { name: "ألوان مخصصة", description: "تخصيص ألوان العلامة", tooltip: "طابق علامتك", category: "الهوية", keywords: "ألوان" },
  },
  customFonts: {
    en: { name: "Custom Fonts", description: "Brand font customization", tooltip: "Typography control", category: "Branding", keywords: "fonts" },
    ar: { name: "خطوط مخصصة", description: "تخصيص خطوط العلامة", tooltip: "التحكم بالطباعة", category: "الهوية", keywords: "خطوط" },
  },
};

const LIMITS = {
  restaurants: {
    en: { name: "Number of Restaurants", description: "Locations you can operate" },
    ar: { name: "عدد المطاعم", description: "المواقع التي يمكنك تشغيلها" },
  },
  items: {
    en: { name: "Number of Menu Items", description: "Menu items per location" },
    ar: { name: "عدد أصناف المنيو", description: "الأصناف لكل موقع" },
  },
  categories: {
    en: { name: "Number of Categories", description: "Menu categories per location" },
    ar: { name: "عدد الفئات", description: "فئات المنيو لكل موقع" },
  },
  ordersPerMonth: {
    en: { name: "Orders per Month", description: "Monthly order volume allowance" },
    ar: { name: "الطلبات شهرياً", description: "حد الطلبات الشهري" },
  },
  qrCodes: {
    en: { name: "QR Codes", description: "Active QR codes allowance" },
    ar: { name: "رموز QR", description: "حد رموز QR النشطة" },
  },
  storage: {
    en: { name: "Storage", description: "Media storage allowance" },
    ar: { name: "التخزين", description: "حد تخزين الوسائط" },
  },
  images: {
    en: { name: "Images", description: "Image uploads allowance" },
    ar: { name: "الصور", description: "حد رفع الصور" },
  },
  staffAccounts: {
    en: { name: "Staff Accounts", description: "Team member seats" },
    ar: { name: "حسابات الموظفين", description: "مقاعد أعضاء الفريق" },
  },
  branches: {
    en: { name: "Branches", description: "Branch locations" },
    ar: { name: "الفروع", description: "مواقع الفروع" },
  },
  devices: {
    en: { name: "Devices", description: "Connected devices" },
    ar: { name: "الأجهزة", description: "الأجهزة المتصلة" },
  },
};

const POLISH = {
  en: {
    countrySearchPlaceholder: "Search country…",
    countrySearchAria: "Search countries",
    countrySelectPlaceholder: "Select country",
    countrySelectAria: "Country",
    currencyAuto: "Currency (from country)",
    monthlyUsd: "Monthly price (USD)",
    yearlyUsd: "Yearly price (USD)",
    billingBoth: "Monthly and Yearly prices (USD)",
    savings: "Save {percent}%",
    popular: "Most popular",
    regionalOverrideOptional: "Regional list price (optional override)",
    summaryTitle: "Commercial summary",
    summaryReady: "Commercial snapshot ready",
    summaryBilling: "Billing",
    summaryRegion: "Region",
    summaryCanonical: "Canonical USD",
    summaryLocal: "Localized price",
    dualSourceRegional: "Regional Price",
    dualSourceFx: "Converted from USD",
    noTechnicalIds: "Commercial view — technical identifiers hidden",
    previewCycle: "Preview billing cycle",
    fxSource: "FX source",
    overrideSource: "Regional override",
  },
  ar: {
    countrySearchPlaceholder: "ابحث عن دولة…",
    countrySearchAria: "بحث الدول",
    countrySelectPlaceholder: "اختر الدولة",
    countrySelectAria: "الدولة",
    currencyAuto: "العملة (من الدولة)",
    monthlyUsd: "السعر الشهري (دولار)",
    yearlyUsd: "السعر السنوي (دولار)",
    billingBoth: "الأسعار الشهرية والسنوية (دولار)",
    savings: "وفّر {percent}%",
    popular: "الأكثر شيوعاً",
    regionalOverrideOptional: "سعر قائمة إقليمي (تجاوز اختياري)",
    summaryTitle: "الملخص التجاري",
    summaryReady: "اللقطة التجارية جاهزة",
    summaryBilling: "الفوترة",
    summaryRegion: "المنطقة",
    summaryCanonical: "الدولار المعياري",
    summaryLocal: "السعر المحلي",
    dualSourceRegional: "سعر إقليمي",
    dualSourceFx: "محوّل من الدولار",
    noTechnicalIds: "عرض تجاري — المعرّفات التقنية مخفية",
    previewCycle: "دورة الفوترة للمعاينة",
    fxSource: "مصدر التحويل",
    overrideSource: "تجاوز إقليمي",
  },
};

function merge(lang) {
  const p = resolve(process.cwd(), `client/src/locales/${lang}.json`);
  const j = JSON.parse(readFileSync(p, "utf8"));
  const cc = j.admin.platformOps.commercialCatalog;
  const features = {};
  for (const [k, v] of Object.entries(FEATURES)) {
    features[k] = v[lang];
  }
  const limits = {};
  for (const [k, v] of Object.entries(LIMITS)) {
    limits[k] = v[lang];
  }
  cc.features = features;
  cc.limits = limits;
  cc.polish = POLISH[lang];
  j.admin.platformOps.commercialCatalog = cc;
  writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  console.log("merged polish keys", lang);
}

merge("en");
merge("ar");
