import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DiningSessionBanner } from "@/components/customer/DiningSessionBanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDiningSessionRecovery } from "@/hooks/useDiningSessionRecovery";
import { saveOrderConfirmationSnapshot } from "@/lib/orderConfirmationStorage";
import { markOrderWelcomeReceived } from "@/lib/orderWelcomeStorage";
import { saveDiningSession } from "@/lib/diningSessionStorage";
import { markCustomerJourneyTracking } from "@/lib/customerJourneyStorage";
import { trpc } from "@/lib/trpc";
import { usePostSubmissionGuard } from "@/hooks/usePostSubmissionGuard";
import { PostSubmissionLockedScreen } from "@/components/customer/PostSubmissionLockedScreen";
import { isDiningSessionOrderingEnabled } from "@/lib/diningSessionRecovery";
import {
  useOrderingCheckout,
  useOrderingClientRuntime,
} from "@/lib/ordering-client";

/**
 * ORDERING-CLIENT-CHECKOUT-1 — QR checkout shell.
 * Channel owns: route bootstrap, dining session, post-submission, tracking side effects.
 * Checkout orchestration (form, notes validation, submit lifecycle) is Client Platform.
 */
export default function CheckoutPage() {
  const [, params] = useRoute("/menu/:slug/table/:tableNumber/checkout");
  const slug = params?.slug ?? "";
  const tableNumber = params?.tableNumber ? parseInt(params.tableNumber, 10) : 0;
  const { language, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const lang = language === "ar" ? "ar" : "en";
  const utils = trpc.useUtils();

  const runtime = useOrderingClientRuntime();
  const checkout = useOrderingCheckout();
  const {
    restaurant,
    isLoading: restaurantLoading,
    gates,
  } = runtime;
  const {
    summaryLines,
    totalAmount,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    orderNotes,
    setOrderNotes,
    isSubmitting,
    supportsOrderNotes,
    goToBrowse,
    submit,
  } = checkout;

  const { data: tableData } = trpc.table.getByNumber.useQuery(
    { restaurantId: (restaurant as { id?: number } | null)?.id ?? 0, tableNumber },
    {
      enabled: !!(restaurant as { id?: number } | null)?.id && tableNumber > 0,
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: "always",
    }
  );

  const { recovery, recoveryDone } = useDiningSessionRecovery({
    slug,
    tableNumber,
    restaurantId: (restaurant as { id?: number } | null)?.id,
    client: {
      getByToken: (input) => utils.client.session.getByToken.query(input),
      getActiveByTable: (input) => utils.client.session.getActiveByTable.query(input),
    },
  });

  const sessionAllowsOrder = isDiningSessionOrderingEnabled(recovery);
  const postSubmission = usePostSubmissionGuard({
    slug,
    tableNumber,
    recovery,
    recoveryDone,
  });

  const canPlaceOrder =
    tableNumber > 0 &&
    gates.platformCanPlaceOrder &&
    sessionAllowsOrder &&
    recoveryDone &&
    !postSubmission.blocked &&
    summaryLines.length > 0;

  const currencySymbol =
    (restaurant as { currencySymbol?: string } | null)?.currencySymbol ?? "ر.س";
  const restaurantName =
    (restaurant as { nameAr?: string } | null)?.nameAr ?? "";
  const tableLabel = ((restaurant as { tableLabel?: string } | null)?.tableLabel ??
    "tables") as "tables" | "rooms";
  const isRooms = tableLabel === "rooms";
  const unitLabel =
    language === "ar" ? (isRooms ? "غرفة" : "طاولة") : isRooms ? "Room" : "Table";
  const bannerStatus = recovery.session?.status ?? recovery.endedStatus;
  const showSessionBanner = recoveryDone && bannerStatus != null;

  useEffect(() => {
    if (!recoveryDone || !postSubmission.blocked || !postSubmission.trackingPath) return;
    setLocation(postSubmission.trackingPath, { replace: true });
  }, [recoveryDone, postSubmission.blocked, postSubmission.trackingPath, setLocation]);

  useEffect(() => {
    if (!recoveryDone || postSubmission.blocked) return;
    if (summaryLines.length === 0) {
      goToBrowse();
    }
  }, [summaryLines.length, recoveryDone, postSubmission.blocked, goToBrowse]);

  useEffect(() => {
    if (!recoveryDone || restaurantLoading) return;
    if (!canPlaceOrder && summaryLines.length > 0) {
      goToBrowse();
    }
  }, [
    canPlaceOrder,
    recoveryDone,
    restaurantLoading,
    summaryLines.length,
    goToBrowse,
  ]);

  const handleSubmitOrder = async () => {
    const restaurantId = (restaurant as { id?: number } | null)?.id;
    if (!restaurantId || !tableData?.id) return;

    const outcome = await submit({
      restaurantId,
      tableId: tableData.id,
      tableNumber,
      sessionToken: recovery.session?.sessionToken,
      channelAllowsSubmit: canPlaceOrder,
      onSuccess: (result, draft) => {
        if (result.sessionToken) {
          saveDiningSession({
            sessionToken: result.sessionToken,
            slug,
            tableNumber,
          });
        }

        saveOrderConfirmationSnapshot({
          orderId: result.orderId ?? 0,
          orderNumber: result.orderNumber ?? "",
          displayReference: result.displayReference,
          trackingToken: result.trackingToken,
          tableNumber: result.tableNumber ?? tableNumber,
          totalAmount: result.totalAmount ?? draft.totalAmount.toFixed(2),
          itemCount:
            result.itemCount ??
            draft.items.reduce((s, i) => s + i.quantity, 0),
          createdAt: result.createdAt ?? new Date().toISOString(),
          status: "pending",
          currencySymbol,
          restaurantName,
          tableLabel,
          customerName: draft.customerName || undefined,
          customerPhone: draft.customerPhone || undefined,
          orderNotes: draft.orderNotes || undefined,
          items: draft.items.map((item) => ({
            nameAr: item.nameAr,
            nameEn: item.nameEn,
            price: item.price,
            quantity: item.quantity,
          })),
        });

        markOrderWelcomeReceived(result.trackingToken);
        markCustomerJourneyTracking({
          slug,
          tableNumber,
          trackingToken: result.trackingToken,
          sessionToken: result.sessionToken ?? recovery.session?.sessionToken,
        });
      },
    });

    if (!outcome.ok && outcome.error.code !== "NOT_READY") {
      toast.error(outcome.error.message);
    }
  };

  if (restaurantLoading || !recoveryDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (postSubmission.blocked) {
    return (
      <PostSubmissionLockedScreen
        language={lang}
        trackingPath={postSubmission.trackingPath}
        onOpenTracking={
          postSubmission.trackingPath
            ? () => setLocation(postSubmission.trackingPath!, { replace: true })
            : undefined
        }
      />
    );
  }

  if (!restaurant || summaryLines.length === 0) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-950 dark:to-gray-900 pb-28"
      dir={dir}
    >
      {showSessionBanner && bannerStatus && (
        <DiningSessionBanner language={lang} status={bannerStatus} />
      )}

      <header className="sticky top-0 z-10 border-b border-orange-200/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={goToBrowse}
            aria-label={language === "ar" ? "العودة للمنيو" : "Back to menu"}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-lg truncate">
              {language === "ar" ? "مراجعة الطلب" : "Review Order"}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {restaurantName} · {unitLabel} {tableNumber}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-orange-200/60 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40">
            <h2 className="font-semibold">
              {language === "ar" ? "ملخص الطلب" : "Order summary"}
            </h2>
          </div>
          <ul className="divide-y divide-border/40">
            {summaryLines.map((item) => (
              <li key={item.menuItemId} className="px-4 py-3 flex justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">
                    {language === "ar" ? item.nameAr : item.nameEn || item.nameAr}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-orange-600 shrink-0">
                  {item.lineTotal.toFixed(2)} {currencySymbol}
                </p>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-border/40 flex justify-between items-center bg-orange-50/50 dark:bg-orange-950/20">
            <span className="font-bold">
              {language === "ar" ? "الإجمالي" : "Total"}
            </span>
            <span className="font-bold text-xl text-orange-600">
              {totalAmount.toFixed(2)} {currencySymbol}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-orange-200/60 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">
            {language === "ar" ? "اختياري" : "Optional"}
          </h2>
          <Input
            placeholder={language === "ar" ? "الاسم (اختياري)" : "Name (optional)"}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <Input
            placeholder={language === "ar" ? "رقم الهاتف (اختياري)" : "Phone (optional)"}
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            dir="ltr"
          />
          {supportsOrderNotes && (
            <Textarea
              placeholder={
                language === "ar" ? "ملاحظات على الطلب (اختياري)" : "Order notes (optional)"
              }
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          )}
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-orange-200/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg">
          <Button
            type="button"
            onClick={handleSubmitOrder}
            disabled={isSubmitting || !canPlaceOrder}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-6 rounded-xl text-base"
          >
            {isSubmitting ? (
              <span className="animate-pulse">
                {language === "ar" ? "جاري الإرسال..." : "Submitting..."}
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <Send className="w-4 h-4" />
                {language === "ar" ? "إرسال الطلب" : "Submit Order"}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
