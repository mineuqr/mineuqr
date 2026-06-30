import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deriveProvisioningWorkflowState,
  filterProductionPrinters,
  provisioningStateCopy,
} from "@/lib/print-workspace/operationalViewModels";
import { connectorReadyForPrint } from "@/lib/print-workspace/viewModels";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function PrinterSelectionDialog({
  open,
  onOpenChange,
  restaurantId,
  language,
  onSelected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: number;
  language: string;
  onSelected?: () => void;
}) {
  const isAr = language === "ar";
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState(false);
  const utils = trpc.useUtils();

  const connectorQuery = trpc.printWorkspace.read.getLocalConnectorStatus.useQuery(
    { restaurantId },
    { enabled: open && restaurantId > 0, refetchInterval: open ? 10_000 : false }
  );

  const connectorOnline = connectorReadyForPrint(connectorQuery.data?.connectionStatus);

  const discoverQuery = trpc.printConnector.discoverPrinters.useQuery(
    { restaurantId },
    { enabled: open && restaurantId > 0 && connectorOnline }
  );

  const provisionMutation = trpc.printerManagement.commands.provisionPrinter.useMutation({
    onSuccess: async () => {
      setProvisioned(true);
      await utils.printWorkspace.read.getCurrentPrinter.invalidate({ restaurantId });
      await utils.printerManagement.read.listPrinters.invalidate({ restaurantId });
      onSelected?.();
      window.setTimeout(() => {
        onOpenChange(false);
        setSelectedId(null);
        setSearch("");
        setProvisioned(false);
      }, 1200);
    },
  });

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setSearch("");
      setProvisioned(false);
    }
  }, [open]);

  const productionPrinters = useMemo(
    () => filterProductionPrinters(discoverQuery.data ?? []),
    [discoverQuery.data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productionPrinters;
    return productionPrinters.filter((p) => p.name.toLowerCase().includes(q));
  }, [productionPrinters, search]);

  const selected = productionPrinters.find((p) => p.id === selectedId) ?? null;

  const workflowState = deriveProvisioningWorkflowState({
    connector: connectorQuery.data,
    isDiscovering: discoverQuery.isLoading || discoverQuery.isFetching,
    isProvisioning: provisionMutation.isPending,
    provisioned,
    printerCount: productionPrinters.length,
  });

  const copy = provisioningStateCopy(workflowState, language);
  const canSelectPrinter =
    workflowState === "printers_found" && selected != null && !provisionMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-slate-800 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle>{isAr ? "إعداد الطابعة" : "Set up printer"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            {workflowState === "provisioned" ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-medium">{copy.title}</p>
              </div>
            ) : (
              <p className="text-sm font-medium text-white">{copy.title}</p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{copy.detail}</p>
            {copy.action && workflowState !== "printers_found" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  if (workflowState === "connector_offline" || workflowState === "no_connector") {
                    void connectorQuery.refetch();
                  } else if (workflowState === "no_printers_found" && connectorOnline) {
                    void discoverQuery.refetch();
                  }
                }}
              >
                {copy.action}
              </Button>
            ) : null}
          </div>

          {workflowState === "printers_found" ? (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={isAr ? "بحث..." : "Search printers..."}
                    className="ps-9 bg-slate-900/60"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void discoverQuery.refetch()}
                  disabled={discoverQuery.isFetching}
                >
                  <RefreshCw
                    className={cn("h-4 w-4", discoverQuery.isFetching && "animate-spin")}
                  />
                </Button>
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {filtered.map((printer) => (
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
                ))}
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isAr ? "إغلاق" : "Close"}
          </Button>
          {workflowState === "printers_found" ? (
            <Button
              type="button"
              disabled={!canSelectPrinter}
              onClick={() => {
                if (!selected) return;
                void provisionMutation.mutateAsync({
                  restaurantId,
                  printerId: selected.id,
                  displayName: selected.name,
                  platform: selected.platform,
                  transport: selected.transport,
                  setAsDefault: true,
                });
              }}
            >
              {provisionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isAr ? (
                "استخدام هذه الطابعة"
              ) : (
                "Use this printer"
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
