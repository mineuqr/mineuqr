import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatRiyadhDate } from "@/lib/datetime";

interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  date: string;
  planName: string;
  invoiceUrl?: string;
}

export default function PaymentHistory() {
  const { t } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch payment history from backend
    const fetchPayments = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call
        // const result = await trpc.subscription.getPaymentHistory.useQuery();
        // setPayments(result.data);
        
        // Mock data for now
        setPayments([
          {
            id: 1,
            amount: 99.99,
            currency: "USD",
            status: "paid",
            date: new Date().toISOString(),
            planName: "Professional",
            invoiceUrl: "#",
          },
          {
            id: 2,
            amount: 29.99,
            currency: "USD",
            status: "paid",
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            planName: "Basic",
            invoiceUrl: "#",
          },
        ]);
      } catch (error) {
        console.error("Error fetching payments:", error);
        toast.error(t("common.error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [t]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-400 bg-green-500/10";
      case "pending":
        return "text-yellow-400 bg-yellow-500/10";
      case "failed":
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
      default:
        return status;
    }
  };

  if (isLoading) {
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {t("common.paymentHistory")}
          </h1>
          <p className="text-cyan-300">
            {t("common.invoices")}
          </p>
        </div>

        {/* Payments Table */}
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
                          {formatRiyadhDate(payment.date, "ar-SA")}
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
                              onClick={() => {
                                toast.info("Opening invoice...");
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              {t("common.view")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => {
                                toast.info("Downloading invoice...");
                              }}
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
                  {t("common.noPayments") || "لا توجد عمليات دفع"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download All Invoices */}
        <div className="mt-8 text-center">
          <Button
            className="bg-cyan-500 hover:bg-cyan-600"
            onClick={() => {
              toast.info("Preparing invoices...");
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
