/** SCREEN-PAIRING-CODE-UX-1 — operator-facing pairing copy (presentation only). */

export type PairingScreenCopy = {
  title: string;
  subtitle: string;
  inputLabel: string;
  inputPlaceholder: string;
  submitLabel: string;
  connectingLabel: string;
  helpHeading: string;
  helpBody: string;
  emptyCodeError: string;
  mismatchError: string;
};

export function pairingScreenCopy(language: string = "en"): PairingScreenCopy {
  const isAr = language === "ar";
  if (isAr) {
    return {
      title: "MineuQR",
      subtitle: "شاشة تشغيل",
      inputLabel: "رمز الربط",
      inputPlaceholder: "A7KD92",
      submitLabel: "ربط الشاشة",
      connectingLabel: "جاري الاتصال…",
      helpHeading: "تحتاج رمزاً؟",
      helpBody: "افتح إدارة الشاشات وانسخ رمز الربط.",
      emptyCodeError: "أدخل رمز الربط من إدارة الشاشات.",
      mismatchError: "تعذر ربط الشاشة. تحقق من الرمز وحاول مرة أخرى.",
    };
  }
  return {
    title: "MineuQR",
    subtitle: "Kitchen Display",
    inputLabel: "Enter Pairing Code",
    inputPlaceholder: "A7KD92",
    submitLabel: "Connect Screen",
    connectingLabel: "Connecting…",
    helpHeading: "Need a code?",
    helpBody: "Open Screen Management and copy the Pairing Code.",
    emptyCodeError: "Enter the pairing code from Screen Management.",
    mismatchError: "Unable to connect this screen. Check the code and try again.",
  };
}

export type ScreenBootLoadingCopy = {
  checking: string;
  connecting: string;
  starting: string;
  startingKitchen: string;
};

export function screenBootLoadingCopy(language: string = "en"): ScreenBootLoadingCopy {
  const isAr = language === "ar";
  if (isAr) {
    return {
      checking: "جاري التحقق من الشاشة…",
      connecting: "جاري الاتصال…",
      starting: "جاري تشغيل الشاشة…",
      startingKitchen: "جاري تشغيل شاشة المطبخ…",
    };
  }
  return {
    checking: "Checking screen…",
    connecting: "Connecting…",
    starting: "Starting display…",
    startingKitchen: "Starting kitchen display…",
  };
}

export type ScreenOnboardingCopy = {
  screenLinkLabel: string;
  pairingCodeLabel: string;
  copyLink: string;
  copyCode: string;
  copied: string;
  moreOptions: string;
  optionalQr: string;
  qrHelper: string;
  pairingCodePending: string;
  openScreenHelper: string;
};

export function screenOnboardingCopy(language: string = "en"): ScreenOnboardingCopy {
  const isAr = language === "ar";
  if (isAr) {
    return {
      screenLinkLabel: "رابط الشاشة",
      pairingCodeLabel: "رمز الربط",
      copyLink: "نسخ الرابط",
      copyCode: "نسخ رمز الربط",
      copied: "تم النسخ",
      moreOptions: "المزيد",
      optionalQr: "رمز QR (اختياري)",
      qrHelper: "للتوافق فقط — الطريقة الأساسية هي رمز الربط.",
      pairingCodePending:
        "يظهر رمز الربط عند إنشاء الشاشة أو إعادة توليد الاعتماد. إذا كانت الشاشة مربوطة مسبقاً، أعد توليد الاعتماد للحصول على رمز جديد.",
      openScreenHelper:
        "افتح الرابط على الجهاز. بعد الإعداد الأول، تعود الشاشة تلقائياً عند فتح الرابط.",
    };
  }
  return {
    screenLinkLabel: "Screen link",
    pairingCodeLabel: "Pairing code",
    copyLink: "Copy link",
    copyCode: "Copy pairing code",
    copied: "Copied",
    moreOptions: "More",
    optionalQr: "QR code (optional)",
    qrHelper: "Compatibility only — pairing code is the primary method.",
    pairingCodePending:
      "The pairing code is shown when you create the screen or regenerate credential. If already paired, regenerate to get a new code.",
    openScreenHelper:
      "Open the link on your device. After the first setup, the screen resumes automatically when you open the link.",
  };
}
