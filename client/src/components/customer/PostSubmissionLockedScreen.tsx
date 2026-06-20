import { Button } from "@/components/ui/button";

type PostSubmissionLockedScreenProps = {
  language: "ar" | "en";
  trackingPath?: string;
  onOpenTracking?: () => void;
};

export function PostSubmissionLockedScreen({
  language,
  trackingPath,
  onOpenTracking,
}: PostSubmissionLockedScreenProps) {
  const isAr = language === "ar";

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-orange-200/60 bg-white dark:bg-gray-900 shadow-xl p-6 sm:p-8 space-y-4 text-center">
        <h1 className="text-xl font-bold text-foreground">
          {isAr ? "تم إرسال الطلب بالفعل" : "Order already submitted"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isAr
            ? "لا يمكن متابعة الطلب من هذه الجلسة."
            : "Ordering is no longer available for this session."}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isAr
            ? "يرجى مسح رمز QR مرة أخرى لبدء جلسة جديدة."
            : "Please scan the QR code again to start a new session."}
        </p>
        {trackingPath && onOpenTracking && (
          <Button type="button" variant="outline" className="w-full" onClick={onOpenTracking}>
            {isAr ? "عرض حالة الطلب" : "View order status"}
          </Button>
        )}
      </div>
    </div>
  );
}
