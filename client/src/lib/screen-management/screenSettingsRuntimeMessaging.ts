import type { OperationalDeviceRole } from "../../../../server/operational-device/domain/deviceRoles";

const KITCHEN_RUNTIME_CONFIG_ROLES: OperationalDeviceRole[] = [
  "kitchen_display",
  "expo_display",
];

export function roleSupportsRuntimeDensityAndCategoryFilter(
  role: OperationalDeviceRole
): boolean {
  return KITCHEN_RUNTIME_CONFIG_ROLES.includes(role);
}

export function screenSettingsSheetDescription(isAr: boolean): string {
  return isAr
    ? "إعدادات العرض — تُطبَّق على الجهاز تلقائياً بعد إعادة تحميل الإعدادات (خلال دقيقة تقريباً)"
    : "Display settings — applied on the device automatically after configuration reload (within about one minute)";
}

export function densitySectionHint(role: OperationalDeviceRole, isAr: boolean): {
  badge: string;
  detail: string;
} {
  if (roleSupportsRuntimeDensityAndCategoryFilter(role)) {
    return {
      badge: isAr ? "نشط في وقت التشغيل" : "Active at runtime",
      detail: isAr
        ? "يُطبَّق على شاشات المطبخ والإكسبو بعد حفظ الإعدادات وإعادة تحميل الجهاز."
        : "Applies on kitchen and expo displays after save and device configuration reload.",
    };
  }
  return {
    badge: isAr ? "محفوظ" : "Stored",
    detail: isAr
      ? "يُحفظ للجهاز — لا يُطبَّق على هذا الدور في وقت التشغيل حالياً."
      : "Saved for the device — not applied for this screen role at runtime yet.",
  };
}

export function categorySectionHint(role: OperationalDeviceRole, isAr: boolean): {
  badge: string;
  detail: string;
} {
  if (roleSupportsRuntimeDensityAndCategoryFilter(role)) {
    return {
      badge: isAr ? "نشط في وقت التشغيل" : "Active at runtime",
      detail: isAr
        ? "تصفية عناصر الطابور حسب الفئات المحددة — بدون تحديد تُعرض كل العناصر."
        : "Filters kitchen queue items by selected categories — leave empty to show all items.",
    };
  }
  return {
    badge: isAr ? "محفوظ" : "Stored",
    detail: isAr
      ? "يُحفظ للجهاز — التصفية غير مفعّلة لهذا الدور في وقت التشغيل حالياً."
      : "Saved for the device — category filtering is not active for this role at runtime yet.",
  };
}
