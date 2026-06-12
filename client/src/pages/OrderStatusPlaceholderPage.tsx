import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

/** PR-CUX-1A placeholder — live status tracking ships in PR-CUX-1B. */
export default function OrderStatusPlaceholderPage() {
  const { language, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/menu/:slug/order/:trackingToken");
  const slug = params?.slug ?? "";
  const trackingToken = params?.trackingToken ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center p-6" dir={dir}>
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-bold">
          {language === "ar" ? "تتبع الطلب" : "Order Tracking"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {language === "ar"
            ? "سيتم تفعيل تحديثات حالة الطلب المباشرة قريباً."
            : "Live order status updates will be available in the next release."}
        </p>
        {trackingToken && (
          <p className="font-mono text-xs text-muted-foreground break-all" dir="ltr">
            {trackingToken}
          </p>
        )}
        <Button
          variant="outline"
          onClick={() =>
            setLocation(`/menu/${slug}/order/${trackingToken}/confirmed`)
          }
        >
          {language === "ar" ? "العودة للتأكيد" : "Back to confirmation"}
        </Button>
      </div>
    </div>
  );
}
