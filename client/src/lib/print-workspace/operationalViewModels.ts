import type { RouterOutputs } from "@/lib/trpc";
import {
  connectorReadyForPrint,
  type WorkspaceHealthState,
} from "@/lib/print-workspace/viewModels";

type LocalConnectorStatus = RouterOutputs["printWorkspace"]["read"]["getLocalConnectorStatus"];
type SessionStatus = RouterOutputs["printWorkspace"]["read"]["getConnectorSessionStatus"];
type CurrentPrinter = RouterOutputs["printWorkspace"]["read"]["getCurrentPrinter"];

export type SystemReadyState = "ready" | "blocked";

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
    headline: { en: "Ready to print", ar: "جاهز للطباعة" },
    subline: {
      en: "Your restaurant connector and printer are online.",
      ar: "موصل المطعم والطابعة متصلان.",
    },
  },
  connectorOffline: {
    headline: { en: "Cannot print right now", ar: "لا يمكن الطباعة الآن" },
    subline: {
      en: "The restaurant connector is offline. Start the connector on the restaurant computer.",
      ar: "موصل المطعم غير متصل. شغّل الموصل على جهاز المطعم.",
    },
  },
  notConnected: {
    headline: { en: "Cannot print right now", ar: "لا يمكن الطباعة الآن" },
    subline: {
      en: "The restaurant has not yet connected to MineuQR.",
      ar: "لم يتصل هذا المطعم بـ MineuQR بعد.",
    },
  },
  sessionPending: {
    headline: { en: "Cannot print right now", ar: "لا يمكن الطباعة الآن" },
    subline: {
      en: "Waiting for the restaurant to finish connecting to MineuQR.",
      ar: "بانتظار اكتمال اتصال المطعم بـ MineuQR.",
    },
  },
  printerUnavailable: {
    headline: { en: "Cannot print right now", ar: "لا يمكن الطباعة الآن" },
    subline: {
      en: "Printer information is unavailable because the connector is not connected.",
      ar: "معلومات الطابعة غير متاحة لأن الموصل غير متصل.",
    },
  },
  noPrinter: {
    headline: { en: "Set up a printer", ar: "إعداد الطابعة" },
    subline: {
      en: "Choose a printer once the MineuQR Connector is running.",
      ar: "اختر طابعة بعد تشغيل موصل MineuQR.",
    },
  },
  printerNotReady: {
    headline: { en: "Printer needs attention", ar: "الطابعة تحتاج انتباهاً" },
    subline: {
      en: "Check the printer on the restaurant computer, then try again.",
      ar: "تحقق من الطابعة على جهاز المطعم ثم أعد المحاولة.",
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
    ready: { en: "Ready", ar: "جاهزة" },
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
      detail: isAr ? "جلسة المطعم نشطة." : "Restaurant session is active.",
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
      headline: isNeverConnected ? COPY.notConnected.headline : COPY.connectorOffline.headline,
      subline: isNeverConnected ? COPY.notConnected.subline : COPY.connectorOffline.subline,
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
    headline: COPY.printerNotReady.headline,
    subline: COPY.printerNotReady.subline,
    nextAction: "fix_printer",
    connectorOk,
    sessionOk,
    printerOk,
  };
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
        title: isAr ? "الموصل غير مثبت" : "Connector not set up",
        detail: isAr
          ? "ثبّت وشغّل موصل MineuQR على جهاز المطعم أولاً."
          : "Install and start the MineuQR Connector on the restaurant computer first.",
        action: isAr ? "تشغيل الموصل" : "Start connector",
      };
    case "connector_offline":
      return {
        title: isAr ? "الموصل متوقف" : "Connector is offline",
        detail: isAr
          ? "لا يمكن اكتشاف الطابعات لأن موصل المطعم المحلي غير متصل."
          : "No printers can be discovered because the Restaurant Local Connector is offline.",
        action: isAr ? "إعادة الاتصال" : "Reconnect connector",
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
        title: isAr ? "لم يتم العثور على طابعات" : "No printers found",
        detail: isAr
          ? "تأكد أن الطابعة مشغّلة ومتصلة بجهاز المطعم، ثم أعد المحاولة."
          : "Make sure a printer is on and connected to the restaurant computer, then try again.",
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
