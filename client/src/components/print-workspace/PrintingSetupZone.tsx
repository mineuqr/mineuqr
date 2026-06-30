import { Button } from "@/components/ui/button";
import {
  deriveOnboardingStep,
  filterProductionPrinters,
  onboardingStepCopy,
  type OnboardingStep,
} from "@/lib/print-workspace/operationalViewModels";
import { connectorReadyForPrint } from "@/lib/print-workspace/viewModels";
import type { RouterOutputs } from "@/lib/trpc";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CurrentPrinter = RouterOutputs["printWorkspace"]["read"]["getCurrentPrinter"];

const STEP_LABELS: { step: OnboardingStep; en: string; ar: string }[] = [
  { step: 1, en: "Connector", ar: "الموصل" },
  { step: 2, en: "Discover", ar: "اكتشاف" },
  { step: 3, en: "Register", ar: "تسجيل" },
  { step: 4, en: "Default", ar: "افتراضية" },
  { step: 5, en: "Test", ar: "اختبار" },
];

export function PrintingSetupZone({
  restaurantId,
  language,
  connectorOk,
  sessionOk,
  currentPrinter,
  onStatusChange,
  onTestPrint,
  isTesting,
}: {
  restaurantId: number;
  language: string;
  connectorOk: boolean;
  sessionOk: boolean;
  currentPrinter: CurrentPrinter | undefined;
  onStatusChange: () => void;
  onTestPrint: () => Promise<void>;
  isTesting: boolean;
}) {
  const isAr = language === "ar";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [testDone, setTestDone] = useState(false);
  const utils = trpc.useUtils();

  const connectorQuery = trpc.printWorkspace.read.getLocalConnectorStatus.useQuery(
    { restaurantId },
    { enabled: restaurantId > 0, refetchInterval: 10_000 }
  );

  const connectorOnline = connectorReadyForPrint(connectorQuery.data?.connectionStatus);

  const discoverQuery = trpc.printWorkspace.read.discoverPrinters.useQuery(
    { restaurantId },
    { enabled: restaurantId > 0 && connectorOnline && sessionOk }
  );

  const listQuery = trpc.printerManagement.read.listPrinters.useQuery(
    { restaurantId },
    { enabled: restaurantId > 0 && connectorOnline && sessionOk }
  );

  const provisionMutation = trpc.printerManagement.commands.provisionPrinter.useMutation({
    onSuccess: async () => {
      await utils.printWorkspace.read.getCurrentPrinter.invalidate({ restaurantId });
      await utils.printerManagement.read.listPrinters.invalidate({ restaurantId });
      onStatusChange();
    },
  });

  const defaultMutation = trpc.printerManagement.commands.setDefaultPrinter.useMutation({
    onSuccess: async () => {
      await utils.printWorkspace.read.getCurrentPrinter.invalidate({ restaurantId });
      await utils.printerManagement.read.listPrinters.invalidate({ restaurantId });
      onStatusChange();
    },
  });

  const productionPrinters = useMemo(
    () => filterProductionPrinters(discoverQuery.data?.printers ?? []),
    [discoverQuery.data?.printers]
  );

  const printerConfigured = Boolean(currentPrinter?.configured && currentPrinter.printer);
  const printerIsDefault = Boolean(currentPrinter?.isDefault);
  const printerTested = Boolean(currentPrinter?.lastValidatedAt || testDone);
  const printerReady = Boolean(currentPrinter?.status?.isReady && currentPrinter.status.isOnline);

  const activeStep = deriveOnboardingStep({
    connectorOk,
    sessionOk,
    printerConfigured,
    printerIsDefault,
    printerTested,
    printerReady,
    discoveredCount: productionPrinters.length,
  });

  const stepCopy = onboardingStepCopy(activeStep, language);
  const registeredPrinters = listQuery.data ?? [];
  const nonDefaultPrinter = registeredPrinters.find((p) => !p.isDefault) ?? null;

  useEffect(() => {
    if (currentPrinter?.lastValidatedAt) {
      setTestDone(true);
    }
  }, [currentPrinter?.lastValidatedAt]);

  const handlePrimaryAction = async () => {
    switch (activeStep) {
      case 1:
        await connectorQuery.refetch();
        onStatusChange();
        break;
      case 2:
        await discoverQuery.refetch();
        break;
      case 3: {
        const selected = productionPrinters.find((p) => p.id === selectedId);
        if (!selected) return;
        await provisionMutation.mutateAsync({
          restaurantId,
          printerId: selected.id,
          displayName: selected.name,
          platform: selected.platform,
          transport: selected.transport,
          setAsDefault: true,
        });
        break;
      }
      case 4:
        if (nonDefaultPrinter) {
          await defaultMutation.mutateAsync({
            restaurantId,
            printerId: nonDefaultPrinter.printerId,
          });
        }
        break;
      case 5:
        await onTestPrint();
        setTestDone(true);
        onStatusChange();
        break;
      default:
        break;
    }
  };

  const primaryDisabled =
    (activeStep === 3 && !selectedId) ||
    provisionMutation.isPending ||
    defaultMutation.isPending ||
    isTesting ||
    discoverQuery.isFetching;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">
        {isAr ? "إعداد الطباعة" : "Printing setup"}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {isAr
          ? "اتبع الخطوات بالترتيب لتجهيز مطعمك لطباعة الطلبات."
          : "Follow the steps in order to prepare your restaurant for printing orders."}
      </p>

      <ol className="mt-6 flex flex-wrap gap-2">
        {STEP_LABELS.map(({ step, en, ar }) => {
          const numericStep = step as number;
          const isActive = activeStep === step;
          const isComplete =
            activeStep === "ready" ||
            (typeof activeStep === "number" && activeStep > numericStep);
          return (
            <li
              key={step}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                isActive
                  ? "border-primary/60 bg-primary/15 text-white"
                  : isComplete
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 text-slate-500"
              )}
            >
              {isComplete && !isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              <span>
                {numericStep}. {isAr ? ar : en}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:p-5">
        <p className="text-base font-medium text-white">{stepCopy.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{stepCopy.detail}</p>

        {activeStep === 1 ? (
          <ul className="mt-4 list-inside list-decimal space-y-2 text-sm text-slate-300">
            <li>{isAr ? "حمّل موصل MineuQR على جهاز المطعم." : "Download MineuQR Connector on your restaurant computer."}</li>
            <li>{isAr ? "ثبّت التطبيق وافتحه." : "Install the app and open it."}</li>
            <li>{isAr ? "سجّل الدخول أو اربط المطعم." : "Sign in or link your restaurant."}</li>
            <li>{isAr ? "اضغط إعادة المحاولة أدناه." : "Tap Retry below."}</li>
          </ul>
        ) : null}

        {activeStep === 2 && discoverQuery.isFetching ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isAr ? "جاري البحث عن الطابعات…" : "Searching for printers…"}
          </div>
        ) : null}

        {activeStep === 3 ? (
          <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
            {productionPrinters.length === 0 ? (
              <p className="text-sm text-slate-400">
                {isAr
                  ? "لم يتم العثور على طابعات بعد. تأكد من تشغيل الطابعة ثم اضغط البحث عن الطابعات."
                  : "No printers detected yet. Make sure your printer is on, then tap Discover printers."}
              </p>
            ) : (
              productionPrinters.map((printer) => (
                <button
                  key={printer.id}
                  type="button"
                  onClick={() => setSelectedId(printer.id)}
                  className={cn(
                    "flex w-full flex-col rounded-lg border px-3 py-2 text-start text-sm transition",
                    selectedId === printer.id
                      ? "border-primary/60 bg-primary/10"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
                  )}
                >
                  <span className="font-medium text-white">{printer.name}</span>
                  <span className="text-xs text-slate-400">
                    {printer.isOnline
                      ? isAr
                        ? "متصلة"
                        : "Online"
                      : isAr
                        ? "غير متصلة"
                        : "Offline"}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}

        {activeStep === 4 && nonDefaultPrinter ? (
          <p className="mt-4 text-sm text-slate-300">
            {isAr ? "الطابعة: " : "Printer: "}
            <span className="font-medium text-white">{nonDefaultPrinter.displayName}</span>
          </p>
        ) : null}

        {activeStep === 5 ? (
          <p className="mt-4 text-sm text-slate-300">
            {currentPrinter?.printer?.displayName
              ? `${isAr ? "الطابعة: " : "Printer: "}${currentPrinter.printer.displayName}`
              : null}
          </p>
        ) : null}

        {activeStep !== "ready" ? (
          <Button
            type="button"
            className="mt-5"
            disabled={primaryDisabled}
            onClick={() => void handlePrimaryAction()}
          >
            {provisionMutation.isPending || defaultMutation.isPending || isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              stepCopy.primaryAction
            )}
          </Button>
        ) : (
          <div className="mt-5 flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{stepCopy.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}
