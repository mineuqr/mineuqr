import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { formatRiyadhDate } from "@/lib/datetime";

export default function SubscriptionManagement() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: currentSub, isLoading: isLoadingSub } = 
    trpc.subscription.getCurrentSubscription.useQuery();

  const handleCancelSubscription = async () => {
    setIsLoading(true);
    try {
      // TODO: Call backend to cancel subscription
      // await trpc.subscription.cancelSubscription.useMutation();
      
      toast.success(t("common.subscriptionCancelled") || "تم إلغاء الاشتراك");
      setShowCancelConfirm(false);
      setTimeout(() => setLocation("/pricing"), 2000);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingSub) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-white mt-4">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!currentSub) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {t("common.noSubscription") || "لا يوجد اشتراك نشط"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("common.subscribeNow") || "يرجى الاشتراك في خطة لعرض تفاصيل الاشتراك"}
            </p>
            <Button
              onClick={() => setLocation("/pricing")}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              {t("common.viewPlans") || "عرض الخطط"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {t("common.subscriptionStatus")}
          </h1>
          <p className="text-cyan-300">
            {t("common.manageYourSubscription") || "إدارة اشتراكك"}
          </p>
        </div>

        {/* Current Subscription */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">
              {t("common.currentPlan") || "الخطة الحالية"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Info */}
            <div className="flex items-start justify-between pb-6 border-b border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("common.planName")}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {currentSub.plan?.nameAr}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">
                  {t("common.active")}
                </span>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("common.billingCycle") || "دورة الفواتير"}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {currentSub.subscription?.billingCycle === "yearly" 
                    ? t("pricing.yearly") 
                    : t("pricing.monthly")}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("common.renewalDate")}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {formatRiyadhDate(currentSub.subscription?.currentPeriodEnd, "ar-SA")}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("common.amount")}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  ${currentSub.plan?.priceMonthly}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("common.status")}
                </p>
                <p className="text-lg font-semibold text-green-400">
                  {t("common.active")}
                </p>
              </div>
            </div>

            {/* Plan Features */}
            <div className="pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">
                {t("common.features") || "المميزات"}
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                  <span>{currentSub.plan?.maxRestaurants} {t("dashboard.restaurants")}</span>
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                  <span>{currentSub.plan?.maxItemsPerRestaurant} {t("dashboard.items")} {t("common.perRestaurant") || "لكل مطعم"}</span>
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                  <span>{currentSub.plan?.maxCategories} {t("dashboard.categories")}</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <Button
            onClick={() => setLocation("/payments")}
            className="w-full bg-cyan-500 hover:bg-cyan-600"
          >
            {t("common.viewPaymentHistory")} →
          </Button>

          <Button
            onClick={() => setLocation("/pricing")}
            variant="outline"
            className="w-full"
          >
            {t("common.upgradePlan") || "ترقية الخطة"}
          </Button>

          <Button
            onClick={() => setShowCancelConfirm(true)}
            variant="destructive"
            className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50"
          >
            {t("common.cancelSubscription")}
          </Button>
        </div>

        {/* Cancel Confirmation */}
        {showCancelConfirm && (
          <Card className="mt-8 bg-red-500/10 border-red-500/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-red-400 mb-2">
                    {t("common.cancelWarning") || "تحذير"}
                  </h3>
                  <p className="text-foreground mb-4">
                    {t("common.cancelWarningMessage") || "هل أنت متأكد من رغبتك في إلغاء الاشتراك؟ ستفقد الوصول إلى جميع المميزات."}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCancelConfirm(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {t("common.keep") || "الاحتفاظ بالاشتراك"}
                </Button>
                <Button
                  onClick={handleCancelSubscription}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  disabled={isLoading}
                >
                  {isLoading ? t("common.processing") : t("common.confirmCancel") || "تأكيد الإلغاء"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
