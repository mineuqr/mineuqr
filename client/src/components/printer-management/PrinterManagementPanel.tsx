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
  onOpenPrintSetup,
}: {
  restaurantId: number;
  language: string;
  onOpenPrintSetup?: () => void;
}) {
  const isAr = language === "ar";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const utils = trpc.useUtils();

  const listQuery = trpc.printerManagement.read.listPrinters.useQuery({ restaurantId });

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

  const printers = listQuery.data ?? [];
  const isEmpty = !listQuery.isLoading && !listQuery.isError && printers.length === 0;

  return (
    <div className={restaurantDash.stack}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {isAr ? "إدارة الطابعات" : "Printer Management"}
        </h1>
        <p className="max-w-2xl text-sm text-slate-400">
          {isAr
            ? "إدارة الطابعات المسجلة في مطعمك."
            : "Manage printers registered for your restaurant."}
        </p>
      </div>

      {isEmpty ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <p className="text-lg font-semibold text-white">
            {isAr ? "لم تقم بإعداد الطباعة بعد." : "You have not configured printing yet."}
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            {isAr
              ? "ابدأ الإعداد من مساحة الطباعة لتسجيل طابعة وطباعة الطلبات."
              : "Start setup from Print Workspace to register a printer and print orders."}
          </p>
          {onOpenPrintSetup ? (
            <Button type="button" className="mt-5" onClick={onOpenPrintSetup}>
              {isAr ? "بدء الإعداد" : "Start setup"}
            </Button>
          ) : null}
        </div>
      ) : (
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
                onClick={() => void listQuery.refetch()}
                disabled={listQuery.isFetching}
              >
                <RefreshCw className={cn("h-4 w-4", listQuery.isFetching && "animate-spin")} />
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
              retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
              isFetching={listQuery.isFetching}
              onRetry={() => listQuery.refetch()}
            />
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
                      {printer.lastValidatedAt ? (
                        <p className="mt-1 text-xs text-emerald-400/90">
                          {isAr ? "تم اختبار الطباعة" : "Print test completed"}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-amber-300/90">
                          {isAr ? "لم يتم اختبار الطباعة بعد" : "Print test not completed yet"}
                        </p>
                      )}
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
                        {isAr ? "طباعة اختبار" : "Print test page"}
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
      )}

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
