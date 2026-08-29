/**
 * ORDER-CARD-OPERATIONAL-PRINT-WINDOWS-1
 * Windows Print Preview for the operational Order Ticket.
 * Reuses Cashier/Settlement Dialog + existing browser print invocation.
 * ORDER-CARD-PRINT-ONE-PAGE-LAYOUT-FIX-1 — isolation body class hides #root
 * during print so the dashboard cannot occupy a blank first page.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  OPERATIONAL_ORDER_TICKET_PRINT_ROOT_ID,
  operationalOrderTicketUiLabel,
  printOperationalOrderTicket,
  type OperationalOrderTicketViewModel,
} from "@/lib/operational-workspace/operationalOrderTicket";
import { Printer } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  language: string;
  ticket: OperationalOrderTicketViewModel | null;
  onOpenChange: (open: boolean) => void;
};

export function OperationalOrderTicketDialog({
  open,
  language,
  ticket,
  onOpenChange,
}: Props) {
  const isAr = language.startsWith("ar");
  const t = (key: Parameters<typeof operationalOrderTicketUiLabel>[0]) =>
    operationalOrderTicketUiLabel(key, language);

  const handlePrint = () => {
    if (!ticket) return;
    try {
      printOperationalOrderTicket();
    } catch {
      toast.error(t("previewFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={isAr ? "rtl" : "ltr"}
        className="max-w-md print:max-w-none print:border-0 print:shadow-none print:static print:top-auto print:left-auto print:translate-none"
      >
        <DialogHeader className="print:hidden">
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {ticket ? (
          <div
            id={OPERATIONAL_ORDER_TICKET_PRINT_ROOT_ID}
            className="space-y-4 text-sm"
          >
            <div className="space-y-1 text-center">
              <p className="text-lg font-semibold tabular-nums tracking-wide">
                {t("orderNumber")}:{" "}
                <span dir="ltr" className="inline-block">
                  {ticket.orderReference}
                </span>
              </p>
              {ticket.tableOrChannelLabel ? (
                <p className="text-muted-foreground">
                  {t("channelOrTable")}: {ticket.tableOrChannelLabel}
                </p>
              ) : null}
              <p className="text-muted-foreground">
                {t("orderTime")}: {ticket.orderTimeLabel}
              </p>
            </div>

            <div className="space-y-1 border-t pt-3">
              <p className="font-medium">{t("items")}</p>
              {ticket.items.length === 0 ? (
                <p>—</p>
              ) : (
                ticket.items.map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex justify-between gap-2"
                  >
                    <span>{item.name}</span>
                    <span className="tabular-nums">× {item.quantity}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 print:hidden">
          <Button
            type="button"
            className="flex-1"
            disabled={!ticket}
            onClick={handlePrint}
          >
            <Printer className="me-2 h-4 w-4" />
            {t("print")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {t("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
