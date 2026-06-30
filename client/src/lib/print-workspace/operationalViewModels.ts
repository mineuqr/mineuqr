import type { RouterOutputs } from "@/lib/trpc";
import {
  connectorReadyForPrint,
  type WorkspaceHealthState,
} from "@/lib/print-workspace/viewModels";

type LocalConnectorStatus = RouterOutputs["printWorkspace"]["read"]["getLocalConnectorStatus"];
type SessionStatus = RouterOutputs["printWorkspace"]["read"]["getConnectorSessionStatus"];
type CurrentPrinter = RouterOutputs["printWorkspace"]["read"]["getCurrentPrinter"];

export type SystemReadyState = "ready" | "blocked";

export type PrintingReadinessLevel =
  | "printing_ready"
  | "setup_required"
  | "attention_required"
  | "printing_unavailable";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | "ready";

export type OperatorNextAction =
  | "start_connector"
  | "reconnect_connector"
  | "setup_printer"
  | "fix_printer"
  | "wait_for_connection"
  | "none";

export type PrinterOperationalState =
  | "ready"
  | "offline"
  | "busy"
  | "paper_out"
  | "driver_error"
  | "unavailable"
  | "not_configured";

export type ProvisioningWorkflowState =
  | "no_connector"
  | "connector_offline"
  | "connector_connecting"
  | "connector_connected"
  | "discovering"
  | "no_printers_found"
  | "printers_found"
  | "provisioning"
  | "provisioned";

export type OperationalPrintStatus = {
  canPrint: boolean;
  systemReady: SystemReadyState;
  headline: { en: string; ar: string };
  subline: { en: string; ar: string };
  nextAction: OperatorNextAction;
  connectorOk: boolean;
  sessionOk: boolean;
  printerOk: boolean;
};

const COPY = {
  ready: {
    headline: { en: "Printing ready", ar: "الطباعة جاهزة" },
    subline: {
      en: "Your restaurant can receive and print orders.",
      ar: "يمكن لمطعمك استقبال الطلبات وطباعتها.",
    },
  },
  printingUnavailable: {
    headline: { en: "Printing unavailable", ar: "الطباعة غير متاحة" },
    subline: {
      en: "Check that MineuQR Connector is running on your restaurant computer.",
      ar: "تأكد أن موصل MineuQR يعمل على جهاز المطعم.",
    },
  },
  setupRequired: {
    headline: { en: "Setup required", ar: "الإعداد مطلوب" },
    subline: {
      en: "You have not configured printing yet. Follow the steps below to get started.",
      ar: "لم تقم بإعداد الطباعة بعد. اتبع الخطوات أدناه للبدء.",
    },
  },
  attentionRequired: {
    headline: { en: "Attention required", ar: "يلزم الانتباه" },
    subline: {
      en: "Your printer needs attention before orders can print.",
      ar: "تحتاج الطابعة إلى اهتمام قبل أن تتمكن من طباعة الطلبات.",
    },
  },
  sessionPending: {
    headline: { en: "Printing unavailable", ar: "الطباعة غير متاحة" },
    subline: {
      en: "Waiting for MineuQR Connector to finish connecting.",
      ar: "بانتظار اكتمال اتصال موصل MineuQR.",
    },
  },
  printerUnavailable: {
    headline: { en: "Printing unavailable", ar: "الطباعة غير متاحة" },
    subline: {
      en: "Printer information is unavailable until MineuQR Connector is running.",
      ar: "معلومات الطابعة غير متاحة حتى يعمل موصل MineuQR.",
    },
  },
  noPrinter: {
    headline: { en: "Setup required", ar: "الإعداد مطلوب" },
    subline: {
      en: "Choose a printer once MineuQR Connector is running.",
      ar: "اختر طابعة بعد تشغيل موصل MineuQR.",
    },
  },
} as const;

export function isSimulatedPrinterId(printerId: string): boolean {
  const id = printerId.toLowerCase();
  return id.includes("-sim-") || id.includes("linux-usb-sim") || id.startsWith("sim-");
}

export function sessionReadyForPrint(session: SessionStatus | undefined): boolean {
  return session?.registration === "Registered";
}

export function derivePrinterOperationalState(
  printer: CurrentPrinter | undefined,
  connectorOk: boolean
): PrinterOperationalState {
  if (!connectorOk) return "unavailable";
  if (!printer?.configured || !printer.printer) return "not_configured";
  if (isSimulatedPrinterId(printer.printer.printerId)) return "not_configured";

  const status = printer.status;
  if (!status) return "offline";
  if (status.paperOut) return "paper_out";
  if (!status.isOnline) return "offline";
  if (!status.isReady) {
    if (status.lastError) return "driver_error";
    return "busy";
  }
  return "ready";
}

export function printerStateLabel(state: PrinterOperationalState, language: string): string {
  const isAr = language === "ar";
  const map: Record<PrinterOperationalState, { en: string; ar: string }> = {
    ready: { en: "Printer ready", ar: "الطابعة جاهزة" },
    offline: { en: "Offline", ar: "غير متصلة" },
    busy: { en: "Busy", ar: "مشغولة" },
    paper_out: { en: "Paper out", ar: "نفد الورق" },
    driver_error: { en: "Driver error", ar: "خطأ في التعريف" },
    unavailable: { en: "Unavailable", ar: "غير متاحة" },
    not_configured: { en: "Not set up", ar: "غير مُعدّة" },
  };
  return isAr ? map[state].ar : map[state].en;
}

export function printerStateGuidance(
  state: PrinterOperationalState,
  language: string
): string | null {
  const isAr = language === "ar";
  switch (state) {
    case "ready":
      return null;
    case "unavailable":
      return isAr
        ? "لا يمكن عرض الطابعة حتى يعمل موصل MineuQR."
        : "Printer details appear after the MineuQR Connector is running.";
    case "not_configured":
      return isAr ? "اختر طابعة من المطعم." : "Choose a printer from the restaurant.";
    case "offline":
      return isAr
        ? "تأكد أن الطابعة مشغّلة ومتصلة بالكمبيوتر."
        : "Make sure the printer is on and connected to the computer.";
    case "paper_out":
      return isAr ? "أعد تعبئة الورق ثم أعد المحاولة." : "Reload paper, then try again.";
    case "driver_error":
      return isAr
        ? "تحقق من إعدادات الطابعة على جهاز المطعم."
        : "Check printer settings on the restaurant computer.";
    case "busy":
      return isAr ? "انتظر حتى تنتهي الطباعة الحالية." : "Wait for the current print job to finish.";
    default:
      return null;
  }
}

export function connectorOperatorCopy(
  connectionStatus: WorkspaceHealthState,
  language: string
): { title: string; detail: string; action: string } {
  const isAr = language === "ar";
  switch (connectionStatus) {
    case "healthy":
    case "connected":
      return {
        title: isAr ? "موصل MineuQR يعمل" : "MineuQR Connector is running",
        detail: isAr
          ? "جهاز المطعم متصل بالسحابة."
          : "The restaurant computer is connected to MineuQR.",
        action: isAr ? "لا يلزم إجراء" : "No action needed",
      };
    case "degraded":
    case "warning":
      return {
        title: isAr ? "الاتصال ضعيف" : "Connection is unstable",
        detail: isAr
          ? "تحقق من الإنترنت على جهاز المطعم."
          : "Check the internet connection on the restaurant computer.",
        action: isAr ? "إعادة الاتصال" : "Reconnect connector",
      };
    default:
      return {
        title: isAr ? "موصل MineuQR متوقف" : "MineuQR Connector is offline",
        detail: isAr
          ? "شغّل تطبيق الموصل على جهاز المطعم."
          : "Start the MineuQR Connector app on the restaurant computer.",
        action: isAr ? "تشغيل الموصل" : "Start connector",
      };
  }
}

export function sessionOperatorCopy(
  session: SessionStatus | undefined,
  language: string
): { title: string; detail: string } {
  const isAr = language === "ar";
  if (session?.registration === "Registered") {
    return {
      title: isAr ? "متصل بـ MineuQR" : "Connected to MineuQR",
      detail: isAr ? "المطعم متصل وجاهز للإعداد." : "Your restaurant is connected and ready for setup.",
    };
  }
  return {
    title: isAr ? "غير متصل بعد" : "Not connected yet",
    detail: isAr
      ? "لم يتصل المطعم بـ MineuQR بعد."
      : "The restaurant has not yet connected to MineuQR.",
  };
}

export function deriveOperationalPrintStatus(input: {
  connector: LocalConnectorStatus | undefined;
  session: SessionStatus | undefined;
  printer: CurrentPrinter | undefined;
}): OperationalPrintStatus {
  const connectorOk = connectorReadyForPrint(input.connector?.connectionStatus);
  const sessionOk = sessionReadyForPrint(input.session);
  const printerState = derivePrinterOperationalState(input.printer, connectorOk);
  const printerOk = printerState === "ready";

  const canPrint = connectorOk && sessionOk && printerOk;

  if (canPrint) {
    return {
      canPrint: true,
      systemReady: "ready",
      headline: COPY.ready.headline,
      subline: COPY.ready.subline,
      nextAction: "none",
      connectorOk,
      sessionOk,
      printerOk,
    };
  }

  if (!connectorOk) {
    const status = input.connector?.connectionStatus ?? "unregistered";
    const isNeverConnected = status === "unregistered";
    return {
      canPrint: false,
      systemReady: "blocked",
      headline: isNeverConnected ? COPY.setupRequired.headline : COPY.printingUnavailable.headline,
      subline: isNeverConnected ? COPY.setupRequired.subline : COPY.printingUnavailable.subline,
      nextAction: isNeverConnected ? "start_connector" : "reconnect_connector",
      connectorOk,
      sessionOk,
      printerOk,
    };
  }

  if (!sessionOk) {
    return {
      canPrint: false,
      systemReady: "blocked",
      headline: COPY.sessionPending.headline,
      subline: COPY.sessionPending.subline,
      nextAction: "wait_for_connection",
      connectorOk,
      sessionOk,
      printerOk,
    };
  }

  if (printerState === "not_configured") {
    return {
      canPrint: false,
      systemReady: "blocked",
      headline: COPY.noPrinter.headline,
      subline: COPY.noPrinter.subline,
      nextAction: "setup_printer",
      connectorOk,
      sessionOk,
      printerOk,
    };
  }

  if (printerState === "unavailable") {
    return {
      canPrint: false,
      systemReady: "blocked",
      headline: COPY.printerUnavailable.headline,
      subline: COPY.printerUnavailable.subline,
      nextAction: "reconnect_connector",
      connectorOk,
      sessionOk,
      printerOk,
    };
  }

  return {
    canPrint: false,
    systemReady: "blocked",
    headline: COPY.attentionRequired.headline,
    subline: COPY.attentionRequired.subline,
    nextAction: "fix_printer",
    connectorOk,
    sessionOk,
    printerOk,
  };
}

export function derivePrintingReadinessLevel(input: {
  operational: OperationalPrintStatus;
  printerState: PrinterOperationalState;
  printerTested: boolean;
}): PrintingReadinessLevel {
  if (input.operational.canPrint) return "printing_ready";
  if (!input.operational.connectorOk || !input.operational.sessionOk) {
    return "printing_unavailable";
  }
  if (
    input.printerState === "not_configured" ||
    !input.printerTested
  ) {
    return "setup_required";
  }
  if (input.printerState !== "ready") return "attention_required";
  return "setup_required";
}

export function readinessLevelLabel(level: PrintingReadinessLevel, language: string): string {
  const isAr = language === "ar";
  const map: Record<PrintingReadinessLevel, { en: string; ar: string }> = {
    printing_ready: { en: "Printing ready", ar: "الطباعة جاهزة" },
    setup_required: { en: "Setup required", ar: "الإعداد مطلوب" },
    attention_required: { en: "Attention required", ar: "يلزم الانتباه" },
    printing_unavailable: { en: "Printing unavailable", ar: "الطباعة غير متاحة" },
  };
  return isAr ? map[level].ar : map[level].en;
}

export function deriveOnboardingStep(input: {
  connectorOk: boolean;
  sessionOk: boolean;
  printerConfigured: boolean;
  printerIsDefault: boolean;
  printerTested: boolean;
  printerReady: boolean;
  discoveredCount: number;
}): OnboardingStep {
  if (
    input.connectorOk &&
    input.sessionOk &&
    input.printerConfigured &&
    input.printerIsDefault &&
    input.printerTested &&
    input.printerReady
  ) {
    return "ready";
  }
  if (!input.connectorOk || !input.sessionOk) return 1;
  if (!input.printerConfigured) {
    return input.discoveredCount > 0 ? 3 : 2;
  }
  if (!input.printerIsDefault) return 4;
  if (!input.printerTested || !input.printerReady) return 5;
  return "ready";
}

export type OnboardingStepCopy = {
  title: string;
  detail: string;
  primaryAction: string;
};

export function onboardingStepCopy(step: OnboardingStep, language: string): OnboardingStepCopy {
  const isAr = language === "ar";
  switch (step) {
    case 1:
      return {
        title: isAr ? "تثبيت موصل MineuQR" : "Install MineuQR Connector",
        detail: isAr
          ? "ثبّت وشغّل موصل MineuQR على جهاز المطعم، ثم اضغط إعادة المحاولة."
          : "Install and start MineuQR Connector on your restaurant computer, then tap Retry.",
        primaryAction: isAr ? "إعادة المحاولة" : "Retry",
      };
    case 2:
      return {
        title: isAr ? "البحث عن الطابعات" : "Discover printers",
        detail: isAr
          ? "سنبحث عن الطابعات المتصلة بجهاز المطعم."
          : "We will search for printers connected to your restaurant computer.",
        primaryAction: isAr ? "البحث عن الطابعات" : "Discover printers",
      };
    case 3:
      return {
        title: isAr ? "تسجيل الطابعة" : "Register printer",
        detail: isAr
          ? "اختر الطابعة التي تريد استخدامها في المطعم."
          : "Choose the printer you want to use in your restaurant.",
        primaryAction: isAr ? "تسجيل الطابعة" : "Register printer",
      };
    case 4:
      return {
        title: isAr ? "اختيار الطابعة الافتراضية" : "Choose default printer",
        detail: isAr
          ? "حدد الطابعة التي ستُستخدم لطباعة الطلبات."
          : "Select the printer that will be used for order printing.",
        primaryAction: isAr ? "تعيين كافتراضية" : "Set as default",
      };
    case 5:
      return {
        title: isAr ? "طباعة صفحة اختبار" : "Print test page",
        detail: isAr
          ? "اطبع صفحة اختبار للتأكد من أن كل شيء يعمل."
          : "Print a test page to confirm everything works.",
        primaryAction: isAr ? "طباعة صفحة اختبار" : "Print test page",
      };
    case "ready":
      return {
        title: isAr ? "الطباعة جاهزة" : "Printing is ready",
        detail: isAr
          ? "يمكنك الآن استقبال الطلبات وطباعتها."
          : "You can now receive and print orders.",
        primaryAction: isAr ? "متابعة" : "Continue",
      };
  }
}

export function primaryActionLabel(action: OperatorNextAction, language: string): string | null {
  const isAr = language === "ar";
  switch (action) {
    case "start_connector":
      return isAr ? "بدء الإعداد" : "Start setup";
    case "reconnect_connector":
      return isAr ? "إعادة المحاولة" : "Retry";
    case "setup_printer":
      return isAr ? "إعداد الطابعة" : "Setup printer";
    case "fix_printer":
      return isAr ? "إصلاح الطابعة" : "Fix printer";
    case "wait_for_connection":
      return isAr ? "إعادة المحاولة" : "Retry";
    case "none":
      return null;
  }
}

export function deriveProvisioningWorkflowState(input: {
  connector: LocalConnectorStatus | undefined;
  isDiscovering: boolean;
  isProvisioning: boolean;
  provisioned: boolean;
  printerCount: number;
}): ProvisioningWorkflowState {
  if (input.provisioned) return "provisioned";
  if (input.isProvisioning) return "provisioning";
  if (input.isDiscovering) return "discovering";

  const status = input.connector?.connectionStatus ?? "unregistered";
  if (status === "unregistered") return "no_connector";
  if (status === "degraded" || status === "warning") return "connector_connecting";
  if (!connectorReadyForPrint(status)) return "connector_offline";
  if (input.printerCount > 0) return "printers_found";
  return "no_printers_found";
}

export function provisioningStateCopy(
  state: ProvisioningWorkflowState,
  language: string
): { title: string; detail: string; action: string | null } {
  const isAr = language === "ar";
  switch (state) {
    case "no_connector":
      return {
        title: isAr ? "الإعداد مطلوب" : "Setup required",
        detail: isAr
          ? "لم تقم بإعداد الطباعة بعد. ثبّت موصل MineuQR على جهاز المطعم."
          : "You have not configured printing yet. Install MineuQR Connector on your restaurant computer.",
        action: isAr ? "بدء الإعداد" : "Start setup",
      };
    case "connector_offline":
      return {
        title: isAr ? "الطباعة غير متاحة" : "Printing unavailable",
        detail: isAr
          ? "تأكد أن موصل MineuQR يعمل على جهاز المطعم."
          : "Check that MineuQR Connector is running on your restaurant computer.",
        action: isAr ? "إعادة المحاولة" : "Retry",
      };
    case "connector_connecting":
      return {
        title: isAr ? "جاري الاتصال" : "Connecting",
        detail: isAr
          ? "بانتظار استقرار اتصال الموصل بالسحابة."
          : "Waiting for the connector to finish connecting to MineuQR.",
        action: null,
      };
    case "connector_connected":
    case "discovering":
      return {
        title: isAr ? "جاري البحث عن الطابعات" : "Discovering printers",
        detail: isAr
          ? "يتم البحث عن الطابعات المتصلة بجهاز المطعم."
          : "Searching for printers connected to the restaurant computer.",
        action: null,
      };
    case "no_printers_found":
      return {
        title: isAr ? "لم يتم العثور على طابعات" : "No printers detected yet",
        detail: isAr
          ? "تأكد أن الطابعة مشغّلة ومتصلة بجهاز المطعم، ثم أعد البحث."
          : "Make sure your printer is on and connected to the restaurant computer, then search again.",
        action: isAr ? "إعادة البحث" : "Search again",
      };
    case "printers_found":
      return {
        title: isAr ? "اختر طابعة" : "Choose a printer",
        detail: isAr
          ? "اختر الطابعة التي تريد استخدامها في المطعم."
          : "Select the printer you want to use for this restaurant.",
        action: null,
      };
    case "provisioning":
      return {
        title: isAr ? "جاري الإعداد" : "Setting up printer",
        detail: isAr ? "يتم حفظ إعدادات الطابعة." : "Saving your printer setup.",
        action: null,
      };
    case "provisioned":
      return {
        title: isAr ? "تم إعداد الطابعة" : "Printer ready",
        detail: isAr ? "يمكنك البدء بالطباعة." : "You can start printing.",
        action: null,
      };
  }
}

export function filterProductionPrinters<T extends { id: string }>(printers: T[]): T[] {
  return printers.filter((p) => !isSimulatedPrinterId(p.id));
}
