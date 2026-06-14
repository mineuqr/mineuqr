import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

/** CUSTOMER-UX-2 — legacy /confirmed route redirects to unified order page. */
export default function OrderConfirmationPage() {
  const { dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/menu/:slug/order/:trackingToken/confirmed");
  const slug = params?.slug ?? "";
  const trackingToken = params?.trackingToken ?? "";

  useEffect(() => {
    if (!slug || !trackingToken) return;
    setLocation(`/menu/${slug}/order/${trackingToken}`);
  }, [slug, trackingToken, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" dir={dir}>
      <p className="text-muted-foreground animate-pulse">
        {dir === "rtl" ? "جاري التوجيه..." : "Redirecting..."}
      </p>
    </div>
  );
}
