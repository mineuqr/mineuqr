import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatRiyadhDate } from "@/lib/datetime";

type InvoiceStatus = "paid" | "pending" | "failed" | "refunded";

interface PaymentRow {
  id: number;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  date: string;
  planName: string;
  invoiceUrl?: string | null;
}

export default function PaymentHistory() {
  const { t, language } = useLanguage();

  const { data: invoices, isLoading: invoicesLoading } = trpc.invoice.list.useQuery();
  const { data: subscriptionData } = trpc.subscription.getCurrentSubscription.useQuery();

  const planLabel =
    subscriptionData?.plan?.nameEn ||
    subscriptionData?.plan?.nameAr ||
    t("invoices.invoice");

  const payments = useMemo<PaymentRow[]>(() => {
    if (!invoices?.length) return [];
    return invoices.map((inv) => ({
      id: inv.id,
      amount: parseFloat(inv.amount) || 0,
      currency: inv.currency,
      status: inv.status as InvoiceStatus,
      date: inv.issuedAt,
      planName: planLabel,
      invoiceUrl: inv.pdfUrl,
    }));
  }, [invoices, planLabel]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-400 bg-green-500/10";
      case "pending":
        return "text-yellow-400 bg-yellow-500/10";
      case "failed":
      case "refunded":
        return "text-red-400 bg-red-500/10";
      default:
        return "text-gray-400 bg-gray-500/10";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return t("common.paid");
      case "pending":
        return t("common.pending");
      case "failed":
        return t("common.failed");
      case "refunded":
        return t("common.refunded") || "Refunded";
      default:
        return status;
    }
  };

  const openInvoice = (url: string | null | undefined) => {
    if (!url) {
      toast.error(t("common.error"));
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadableInvoices = payments.filter((p) => p.invoiceUrl);

  if (invoicesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-white mt-4">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {t("common.paymentHistory")}
          </h1>
          <p className="text-cyan-300">
            {t("common.invoices")}
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              {t("common.paymentHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground">
                        {t("common.date")}
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground">
                        {t("common.planName")}
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground">
                        {t("common.amount")}
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground">
                        {t("common.status")}
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground">
                        {t("common.invoices")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-foreground">
                          {formatRiyadhDate(payment.date, language === "ar" ? "ar-SA" : "en-US")}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {payment.planName}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          ${payment.amount.toFixed(2)} {payment.currency}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
                            {getStatusLabel(payment.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={!payment.invoiceUrl}
                              onClick={() => openInvoice(payment.invoiceUrl)}
                            >
                              <Eye className="w-4 h-4" />
                              {t("common.view")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={!payment.invoiceUrl}
                              onClick={() => openInvoice(payment.invoiceUrl)}
                            >
                              <Download className="w-4 h-4" />
                              {t("common.download")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {t("common.noPayments") || t("invoices.noInvoices")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button
            className="bg-cyan-500 hover:bg-cyan-600"
            disabled={downloadableInvoices.length === 0}
            onClick={() => {
              if (downloadableInvoices.length === 0) {
                toast.info(t("invoices.noInvoices"));
                return;
              }
              for (const inv of downloadableInvoices) {
                openInvoice(inv.invoiceUrl);
              }
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            {t("common.downloadAll") || "تحميل جميع الفواتير"}
          </Button>
        </div>
      </div>
    </div>
  );
}
