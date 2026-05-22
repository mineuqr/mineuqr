import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SubscriptionCancel() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border-border">
        <CardHeader className="text-center">
          <XCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <CardTitle className="text-2xl text-foreground">
            {t("common.cancelledTitle") || "تم إلغاء العملية"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-foreground mb-2">
              {t("common.paymentCancelled") || "تم إلغاء عملية الدفع"}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("common.tryAgainLater") || "يمكنك محاولة مرة أخرى لاحقاً"}
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {t("common.cancelReason") || "إذا واجهت مشكلة، يرجى التواصل معنا للحصول على المساعدة."}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setLocation("/pricing")}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              {t("common.backToPricing") || "العودة للخطط"}
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
