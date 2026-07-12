/** SCREEN-MANAGEMENT-UX-1E — certified fleet action labels (Revision B). */

export function fleetScreenActionLabels(language: string) {
  const isAr = language === "ar";
  return {
    openScreen: isAr ? "فتح الشاشة" : "Open screen",
    setUpScreen: isAr ? "إعداد الشاشة" : "Set up screen",
    settings: isAr ? "الإعدادات" : "Settings",
  };
}
