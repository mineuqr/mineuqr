import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatRiyadhDate } from "@/lib/datetime";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AuthGatePending, LoginRequiredCard, PageDataLoading } from "@/components/AuthGate";
import { useCommercialFeatureVisibility } from "@/hooks/useCommercialFeatureVisibility";

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { t, language } = useLanguage();
  const gate = useAuthGate();
  const { canonicalPlanLabel, isReady: entitlementsReady } =
    useCommercialFeatureVisibility();
  const uiLang = language === "ar" ? "ar" : "en";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [subscription, setSubscription] = useState<any>(null);

  const {
    data: currentSub,
    isLoading: isLoadingSub,
  } = trpc.subscription.getCurrentSubscription.useQuery(undefined, {
    enabled: gate.authResolved && gate.isAuthenticated,
  });

  if (gate.isPending) {
    return <AuthGatePending minHeight="min-h-[60vh]" />;
  }

  if (gate.showLoginRequired) {
    return <LoginRequiredCard />;
  }

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      return;
    }

    if (isLoadingSub) return;

    // Simulate processing delay
    const timer = setTimeout(() => {
      if (currentSub) {
        setSubscription(currentSub);
        setStatus("success");
        toast.success(t("common.subscriptionSuccess") || "تم تفعيل الاشتراك بنجاح!");
      } else {
        setStatus("error");
        toast.error(t("common.subscriptionError") || "حدث خطأ في معالجة الاشتراك");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [search, currentSub, t, isLoadingSub]);

  if (status === "loading") {
    if (isLoadingSub) {
      return <PageDataLoading minHeight="min-h-[60vh]" />;
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
            <p className="text-foreground">{t("common.processing") || "جاري معالجة الاشتراك..."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {t("common.error") || "خطأ"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("common.subscriptionError") || "حدث خطأ في معالجة الاشتراك"}
            </p>
            <Button
              onClick={() => setLocation("/pricing")}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              {t("common.backToPricing") || "العودة للخطط"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border-border">
        <CardHeader className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl text-foreground">
            {t("common.successTitle") || "تم بنجاح!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-foreground mb-2">
              {t("common.subscriptionActivated") || "تم تفعيل اشتراكك بنجاح"}
            </p>
            {subscription && (
              <div className="bg-muted p-4 rounded-lg mt-4">
                <p className="text-sm text-muted-foreground">
                  {t("common.planName") || "الخطة"}:{" "}
                  {(entitlementsReady && canonicalPlanLabel(uiLang)) ||
                    subscription.plan?.nameAr}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("common.renewalDate") || "تاريخ التجديد"}:{" "}
                  {formatRiyadhDate(subscription.subscription?.currentPeriodEnd, "ar-SA")}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setLocation("/dashboard")}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              {t("common.goToDashboard") || "الذهاب إلى لوحة التحكم"}
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full"
            >
              {t("common.backHome") || "العودة للرئيسية"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>
              {t("common.needHelp") || "هل تحتاج إلى مساعدة؟"}{" "}
              <a href="mailto:support@qrmenu.com" className="text-cyan-400 hover:underline">
                {t("common.contactSupport") || "تواصل معنا"}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
