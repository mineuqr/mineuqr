import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { PrinterSelectionDialog } from "@/components/print-workspace/PrinterSelectionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Loader2, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { useState } from "react";

export function PrinterManagementPanel({
  restaurantId,
  language,
}: {
  restaurantId: number;
  language: string;
}) {
  const isAr = language === "ar";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [diagnosticsId, setDiagnosticsId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const utils = trpc.useUtils();

  const listQuery = trpc.printerManagement.read.listPrinters.useQuery({ restaurantId });
  const diagnosticsQuery = trpc.printerManagement.read.getDiagnostics.useQuery(
    { restaurantId, printerId: diagnosticsId ?? "" },
    { enabled: !!diagnosticsId }
  );

  const removeMutation = trpc.printerManagement.commands.removePrinter.useMutation({
    onSuccess: () => void utils.printerManagement.read.listPrinters.invalidate({ restaurantId }),
  });
  const defaultMutation = trpc.printerManagement.commands.setDefaultPrinter.useMutation({
    onSuccess: () => {
      void utils.printerManagement.read.listPrinters.invalidate({ restaurantId });
      void utils.printWorkspace.read.getCurrentPrinter.invalidate({ restaurantId });
    },
  });
  const renameMutation = trpc.printerManagement.commands.renamePrinter.useMutation({
    onSuccess: () => {
      void utils.printerManagement.read.listPrinters.invalidate({ restaurantId });
      setRenameId(null);
    },
  });
  const testMutation = trpc.printerManagement.commands.testPrint.useMutation();
  const discoverMutation = trpc.printerManagement.read.discoverPrinters.useQuery(
    { restaurantId },
    { enabled: false }
  );

  const printers = listQuery.data ?? [];

  return (
    <div className={restaurantDash.stack}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {isAr ? "إدارة الطابعات" : "Printer Management"}
        </h1>
        <p className="max-w-2xl text-sm text-slate-400">
          {isAr
            ? "إعداد الطابعات والتشخيص — للمسؤولين فقط"
            : "Printer provisioning and diagnostics — administrative workspace"}
        </p>
      </div>

      <RestaurantDashSection
        title={isAr ? "الطابعات المسجلة" : "Registered printers"}
        headerAside={
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4 me-1" />
              {isAr ? "إضافة" : "Add"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                void listQuery.refetch();
                void discoverMutation.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        {listQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          </div>
        ) : listQuery.isError ? (
          <RestaurantSectionError
            message={listQuery.error.message}
            retryLabel={isAr ? "إعادة" : "Retry"}
            isFetching={listQuery.isFetching}
            onRetry={() => listQuery.refetch()}
          />
        ) : printers.length === 0 ? (
          <p className="text-sm text-slate-400">
            {isAr ? "لا توجد طابعات مسجلة. أضف طابعة للبدء." : "No printers registered. Add a printer to begin."}
          </p>
        ) : (
          <ul className="space-y-3">
            {printers.map((printer) => (
              <li
                key={printer.printerId}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {printer.displayName}
                      {printer.isDefault ? (
                        <span className="ms-2 text-xs text-amber-400">
                          ({isAr ? "افتراضية" : "Default"})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-400">
                      {printer.transport} · {printer.platform}
                    </p>
                    {printer.lastValidatedAt ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {isAr ? "آخر تحقق: " : "Validated: "}
                        {printer.lastValidatedAt}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!printer.isDefault ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={defaultMutation.isPending}
                        onClick={() =>
                          void defaultMutation.mutateAsync({
                            restaurantId,
                            printerId: printer.printerId,
                          })
                        }
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={testMutation.isPending}
                      onClick={() =>
                        void testMutation.mutateAsync({
                          restaurantId,
                          printerId: printer.printerId,
                        })
                      }
                    >
                      {isAr ? "اختبار" : "Test"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDiagnosticsId(printer.printerId);
                        setRenameId(null);
                      }}
                    >
                      {isAr ? "تشخيص" : "Diagnostics"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRenameId(printer.printerId);
                        setRenameValue(printer.displayName);
                      }}
                    >
                      {isAr ? "إعادة تسمية" : "Rename"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={removeMutation.isPending}
                      onClick={() =>
                        void removeMutation.mutateAsync({
                          restaurantId,
                          printerId: printer.printerId,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {renameId === printer.printerId ? (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="max-w-xs bg-slate-900/60"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        void renameMutation.mutateAsync({
                          restaurantId,
                          printerId: printer.printerId,
                          displayName: renameValue,
                        })
                      }
                    >
                      {isAr ? "حفظ" : "Save"}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </RestaurantDashSection>

      {diagnosticsId && diagnosticsQuery.data ? (
        <RestaurantDashSection title={isAr ? "تشخيص الطابعة" : "Printer diagnostics"}>
          <pre className="max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300">
            {JSON.stringify(diagnosticsQuery.data, null, 2)}
          </pre>
          <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => setDiagnosticsId(null)}>
            {isAr ? "إغلاق" : "Close"}
          </Button>
        </RestaurantDashSection>
      ) : null}

      <PrinterSelectionDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        restaurantId={restaurantId}
        language={language}
        onSelected={() => void listQuery.refetch()}
      />
    </div>
  );
}
