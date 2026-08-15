import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Snowflake } from "lucide-react";

/** Presentation only — data is preserved; renewal restores the same identity. */
export function FrozenAccountBanner({
  language,
  className = "",
}: {
  language: "ar" | "en";
  className?: string;
}) {
  const isAr = language === "ar";
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 ${className}`}
    >
      <Snowflake className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">
          {isAr ? "تم تجميد الخدمة التجارية مؤقتاً" : "Commercial service is temporarily frozen"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr
            ? "انتهت صلاحية الاشتراك أو الفترة التجريبية. بياناتك وقائمة QR محفوظة. التجديد يعيد نفس المطعم والمنيو ورمز QR."
            : "Your subscription or trial has ended. Your data and QR identity are preserved. Renewal restores the same restaurant, menu, and QR."}
        </p>
        <Link href="/pricing" className="mt-3 inline-block">
          <Button variant="outline" size="sm">
            {isAr ? "عرض الخطط والتجديد" : "View plans and renew"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
