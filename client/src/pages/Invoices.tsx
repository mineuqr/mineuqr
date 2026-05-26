import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AuthGatePending } from "@/components/AuthGate";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, AlertCircle, Filter, Receipt, CreditCard, Clock } from "lucide-react";
import { Link } from "wouter";
import { formatRiyadhDate } from "@/lib/datetime";

type InvoiceStatus = "pending" | "paid" | "failed" | "refunded";

export default function Invoices() {
  const gate = useAuthGate();
  const { authResolved, isAuthenticated } = gate;
  const { t, language } = useLanguage();
  const dateLocale = language === "ar" ? "ar-SA" : "en-US";
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  const { data: invoices, isLoading, error } = trpc.invoice.list.useQuery(undefined, {
    enabled: authResolved && isAuthenticated,
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (statusFilter === "all") return invoices;
    return (invoices as any[]).filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  const stats = useMemo(() => {
    if (!invoices) return { total: 0, paid: 0, pending: 0, totalAmount: 0 };
    const invArr = invoices as any[];
    return {
      total: invArr.length,
      paid: invArr.filter((i) => i.status === "paid").length,
      pending: invArr.filter((i) => i.status === "pending").length,
      totalAmount: invArr.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
    };
  }, [invoices]);

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showLoginRequired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("invoices.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t("invoices.loginRequired")}
            </p>
            <Link href="/dashboard">
              <Button className="w-full">{t("common.dashboard")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {t("common.error")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filterButtons: { label: string; value: InvoiceStatus | "all" }[] = [
    { label: t("invoices.filterAll"), value: "all" },
    { label: t("invoices.filterPaid"), value: "paid" },
    { label: t("invoices.filterPending"), value: "pending" },
    { label: t("invoices.filterFailed"), value: "failed" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t("invoices.title")}</h1>
          <p className="text-cyan-300">{t("invoices.description")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("invoices.invoiceCount")}</p>
                <p className="text-xl font-bold text-foreground">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("invoices.paidInvoices")}</p>
                <p className="text-xl font-bold text-foreground">{stats.paid}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("invoices.pendingInvoices")}</p>
                <p className="text-xl font-bold text-foreground">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("invoices.totalAmount")}</p>
                <p className="text-xl font-bold text-foreground">${stats.totalAmount.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={statusFilter === btn.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(btn.value)}
              className={statusFilter === btn.value ? "bg-cyan-500 hover:bg-cyan-600" : ""}
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="pt-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">{t("invoices.noInvoices")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice: any) => (
              <Card key={invoice.id} className="bg-card border-border hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-foreground">
                        {t("invoices.invoice")} #{invoice.invoiceNumber}
                      </CardTitle>
                      <CardDescription>
                        {t("invoices.issuedDate")}: {formatRiyadhDate(invoice.issuedAt, dateLocale)}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        invoice.status === "paid"
                          ? "default"
                          : invoice.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                      className={
                        invoice.status === "paid"
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : invoice.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }
                    >
                      {t(`invoices.status.${invoice.status}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("invoices.amount")}</p>
                      <p className="text-lg font-semibold text-foreground">
                        {invoice.currency} {parseFloat(invoice.amount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("invoices.dueDate")}</p>
                      <p className="text-lg font-semibold text-foreground">
                        {formatRiyadhDate(invoice.dueAt, dateLocale)}
                      </p>
                    </div>
                    {invoice.paidAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t("invoices.paidDate")}</p>
                        <p className="text-lg font-semibold text-green-400">
                          {formatRiyadhDate(invoice.paidAt, dateLocale)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {invoice.pdfUrl && (
                      <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="h-4 w-4" />
                          {t("invoices.downloadPdf")}
                        </Button>
                      </a>
                    )}
                    {invoice.status === "pending" && (
                      <Link href={`/payment?invoiceId=${invoice.id}`}>
                        <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600">{t("invoices.pay")}</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
