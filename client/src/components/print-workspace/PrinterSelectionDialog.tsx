import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

export type PrinterPickerItem = {
  id: string;
  name: string;
  platform: string;
  transport: string;
  isOnline: boolean;
};

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
  const utils = trpc.useUtils();

  const discoverQuery = trpc.printConnector.discoverPrinters.useQuery(
    { restaurantId },
    { enabled: open && restaurantId > 0 }
  );

  const capabilitiesQuery = trpc.printConnector.getPrinterCapabilities.useQuery(
    { restaurantId, printerId: selectedId ?? "" },
    { enabled: open && !!selectedId }
  );

  const provisionMutation = trpc.printerManagement.commands.provisionPrinter.useMutation({
    onSuccess: async () => {
      await utils.printWorkspace.read.getCurrentPrinter.invalidate({ restaurantId });
      await utils.printerManagement.read.listPrinters.invalidate({ restaurantId });
      onSelected?.();
      onOpenChange(false);
      setSelectedId(null);
      setSearch("");
    },
  });

  const printers = discoverQuery.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return printers;
    return printers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q) ||
        p.transport.toLowerCase().includes(q)
    );
  }, [printers, search]);

  const selected = printers.find((p) => p.id === selectedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-slate-800 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle>{isAr ? "اختيار طابعة" : "Select printer"}</DialogTitle>
        </DialogHeader>

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
            <RefreshCw className={cn("h-4 w-4", discoverQuery.isFetching && "animate-spin")} />
          </Button>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {discoverQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              {isAr ? "لا توجد طابعات." : "No printers found."}
            </p>
          ) : (
            filtered.map((printer) => (
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
                  {printer.platform} · {printer.transport} ·{" "}
                  {printer.isOnline ? (isAr ? "متصل" : "Online") : isAr ? "غير متصل" : "Offline"}
                </span>
              </button>
            ))
          )}
        </div>

        {selected && capabilitiesQuery.data ? (
          <p className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-xs text-slate-400">
            {isAr ? "القدرات: " : "Capabilities: "}
            {capabilitiesQuery.data.paperWidthMm ?? "—"}mm ·{" "}
            {capabilitiesQuery.data.maxCharsPerLine ?? "—"} {isAr ? "حرف/سطر" : "chars/line"}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            type="button"
            disabled={!selected || provisionMutation.isPending}
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
              "اختيار"
            ) : (
              "Select"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
