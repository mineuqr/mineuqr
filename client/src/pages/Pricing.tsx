import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Check, Mail, MessageCircle, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { QrCode } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function PayPalCheckoutButton({
  planId,
  billingCycle,
  isAuthenticated,
  setLocation,
  planName,
  price,
}: {
  planId: number;
  billingCycle: "monthly" | "yearly";
  isAuthenticated: boolean;
  setLocation: (path: string) => void;
  planName: string;
  price: string;
}) {
  const createCheckout = trpc.subscription.createCheckoutSession.useMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { t, language } = useLanguage();

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      setLocation("/");
      toast.info(t('pricing.loginFirst'));
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    try {
      const result = await createCheckout.mutateAsync({
        planId,
        billingCycle,
      });

      if (result.orderId) {
        const checkoutUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${result.orderId}`;
        toast.success(t('pricing.redirectingToPayment'));
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(t('pricing.paymentError'));
    } finally {
      setIsLoading(false);
    }
  };

  const cycleText = billingCycle === 'yearly' ? t('pricing.yearly') : t('pricing.monthly');

  return (
    <>
      <Button
        onClick={handleCheckout}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.23A.932.932 0 0 1 5.865 1.5h7.334c2.51 0 4.086.725 4.686 2.155.277.662.361 1.39.25 2.165l-.013.082v.073c.55 2.88-1.248 4.875-4.924 4.875h-1.25a.932.932 0 0 0-.92.73l-.793 5.027-.226 1.43a.49.49 0 0 1-.484.4z"/>
        </svg>
        {isLoading ? t("common.processing") : "PayPal"}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-slate-800 border-slate-700" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">
              {t('pricing.confirmSubscription')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-cyan-300 text-base space-y-3">
              <p>{t('pricing.confirmMessage')}</p>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('pricing.planLabel')}:</span>
                  <span className="text-white font-semibold">{planName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('pricing.priceLabel')}:</span>
                  <span className="text-cyan-400 font-bold">${price}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('pricing.cycleLabel')}:</span>
                  <span className="text-white">{cycleText}</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={language === 'ar' ? 'flex-row-reverse gap-2' : ''}>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold hover:from-blue-700 hover:to-blue-600"
            >
              {t('pricing.confirmAndPay')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TapCheckoutButton({
  planId,
  billingCycle,
  isAuthenticated,
  setLocation,
  planName,
  price,
}: {
  planId: number;
  billingCycle: "monthly" | "yearly";
  isAuthenticated: boolean;
  setLocation: (path: string) => void;
  planName: string;
  price: string;
}) {
  const createTapCheckout = trpc.subscription.createTapCheckout.useMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { t, language } = useLanguage();

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      setLocation("/");
      toast.info(t('pricing.loginFirst'));
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    try {
      const result = await createTapCheckout.mutateAsync({
        planId,
        billingCycle,
      });

      if (result.checkoutUrl) {
        toast.success(t('pricing.redirectingToPayment'));
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      console.error("Tap checkout error:", error);
      toast.error(t('pricing.paymentError'));
    } finally {
      setIsLoading(false);
    }
  };

  const cycleText = billingCycle === 'yearly' ? t('pricing.yearly') : t('pricing.monthly');

  return (
    <>
      <Button
        onClick={handleCheckout}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-bold"
      >
        <CreditCard className="w-5 h-5 mr-2" />
        {isLoading ? t("common.processing") : (language === 'ar' ? "الدفع بالبطاقة (Visa/Mastercard)" : "Pay with Card (Visa/Mastercard)")}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-slate-800 border-slate-700" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">
              {t('pricing.confirmSubscription')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-cyan-300 text-base space-y-3">
              <p>{t('pricing.confirmMessage')}</p>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('pricing.planLabel')}:</span>
                  <span className="text-white font-semibold">{planName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('pricing.priceLabel')}:</span>
                  <span className="text-cyan-400 font-bold">${price}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('pricing.cycleLabel')}:</span>
                  <span className="text-white">{cycleText}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400 mt-2">
                <CreditCard className="w-4 h-4" />
                <span>{language === 'ar' ? "ستتم إعادة توجيهك إلى صفحة الدفع الآمنة" : "You will be redirected to a secure payment page"}</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={language === 'ar' ? 'flex-row-reverse gap-2' : ''}>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-900 font-bold hover:from-cyan-600 hover:to-cyan-500"
            >
              {t('pricing.confirmAndPay')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const { data: plans, isLoading } = trpc.subscription.listPlans.useQuery();
  const { data: currentSub } = trpc.subscription.getCurrentSubscription.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: trialStatus } = trpc.subscription.checkTrialStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "yearly">("yearly");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-white mt-4">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663504545475/fcy9GqTzfuy9H9eCsDbdLA/mineuqr-logo_150417d8.png"
              alt="mineuqr"
              className="h-14 w-auto object-contain"
            />
            <span className="text-2xl font-bold text-foreground hidden sm:inline">
              mine<span className="text-gradient-teal">uqr</span>
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Button
              onClick={() => setLocation("/")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {t("common.back")}
            </Button>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto pt-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("pricing.title")}
          </h1>
          <p className="text-xl text-cyan-300 mb-8">
            {t("pricing.subtitle")}
          </p>

          {/* Trial Status */}
          {isAuthenticated && trialStatus && (
            <div className="inline-block bg-gradient-to-r from-cyan-500/20 to-orange-500/20 border border-cyan-500/50 rounded-lg px-6 py-3 mb-8">
              <p className="text-cyan-300">
                {trialStatus.isActive ? (
                  <>
                    ✨ {t("common.trialEndsIn")}
                    {trialStatus.trialEndDate && (
                      <span className="text-orange-400 mr-2">
                        ({new Date(trialStatus.trialEndDate).toLocaleDateString()})
                      </span>
                    )}
                  </>
                ) : (
                  t("common.expired")
                )}
              </p>
            </div>
          )}
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-800/50 border border-cyan-500/30 rounded-lg p-1 flex gap-2">
            <button
              onClick={() => setSelectedCycle("monthly")}
              className={`px-6 py-2 rounded transition-all ${
                selectedCycle === "monthly"
                  ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-900 font-semibold"
                  : "text-cyan-300 hover:text-cyan-200"
              }`}
            >
              {t("pricing.monthly")}
            </button>
            <button
              onClick={() => setSelectedCycle("yearly")}
              className={`px-6 py-2 rounded transition-all ${
                selectedCycle === "yearly"
                  ? "bg-gradient-to-r from-orange-500 to-orange-400 text-slate-900 font-semibold"
                  : "text-cyan-300 hover:text-cyan-200"
              }`}
            >
              {t("pricing.yearly")}
              <span className="text-xs mr-2 bg-orange-600/50 px-2 py-1 rounded">{t("pricing.save")} 20%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans && plans.length > 0 ? plans.map((plan) => {
            const price =
              selectedCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
            const isCurrentPlan = currentSub?.plan?.id === plan.id;
            const features = language === 'ar' && plan.featuresAr 
              ? JSON.parse(plan.featuresAr as string) 
              : plan.features ? JSON.parse(plan.features as string) : [];

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-300 ${
                  isCurrentPlan
                    ? "border-2 border-cyan-400 shadow-lg shadow-cyan-500/50"
                    : "border border-cyan-500/30 hover:border-cyan-400"
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-900 px-4 py-1 text-sm font-bold rounded-bl-lg">
                    {t('pricing.currentPlan')}
                  </div>
                )}

                <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{language === 'ar' ? plan.nameAr : plan.nameEn}</h3>
                  <p className="text-cyan-300 text-sm mb-6">{language === 'ar' ? plan.descriptionAr : plan.descriptionEn}</p>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-orange-400">
                        ${price}
                      </span>
                      <span className="text-cyan-300">
                        {selectedCycle === "yearly" ? t('pricing.year') : t('pricing.month')}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {/* Display features from database */}
                    {features && features.length > 0 ? (
                      features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-3 text-cyan-200">
                          <Check className="w-5 h-5 text-cyan-400" />
                          <span>{feature}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-cyan-200">No features listed</li>
                    )}
                  </ul>

                  {/* CTA Buttons */}
                  {isCurrentPlan ? (
                    <Button disabled className="w-full bg-slate-700 text-slate-400">
                      {t('pricing.currentPlan')}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      {/* Tap Payments - الدفع بالبطاقة (الزر الرئيسي) */}
                      <TapCheckoutButton
                        planId={plan.id}
                        billingCycle={selectedCycle}
                        isAuthenticated={isAuthenticated}
                        setLocation={setLocation}
                        planName={language === 'ar' ? plan.nameAr : plan.nameEn}
                        price={selectedCycle === 'yearly' ? (plan.priceYearly || plan.priceMonthly) : plan.priceMonthly}
                      />
                      {/* PayPal */}
                      <PayPalCheckoutButton
                        planId={plan.id}
                        billingCycle={selectedCycle}
                        isAuthenticated={isAuthenticated}
                        setLocation={setLocation}
                        planName={language === 'ar' ? plan.nameAr : plan.nameEn}
                        price={selectedCycle === 'yearly' ? (plan.priceYearly || plan.priceMonthly) : plan.priceMonthly}
                      />
                      {/* Email */}
                      <a
                        href={language === 'ar' 
                          ? `mailto:info@mineuqr.com?subject=طلب اشتراك - ${plan.nameAr}&body=مرحباً،%0A%0Aأرغب في الاشتراك في ${plan.nameAr} (الدورة: ${selectedCycle === "yearly" ? "سنوية" : "شهرية"} - $${price}).%0A%0Aالاسم: %0Aاسم المطعم: %0Aرقم الهاتف: %0A%0Aشكراً`
                          : `mailto:info@mineuqr.com?subject=Subscription Request - ${plan.nameEn}&body=Hello,%0A%0AI would like to subscribe to ${plan.nameEn} (Cycle: ${selectedCycle} - $${price}).%0A%0AName: %0ARestaurant Name: %0APhone: %0A%0AThank you`
                        }
                        className="w-full flex items-center justify-center gap-2 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200 rounded-md px-4 py-2 text-sm font-medium transition-all"
                      >
                        <Mail className="w-4 h-4" />
                        {t('pricing.contactViaEmail')}
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            );
          }) : (
            <div className="col-span-3 text-center text-cyan-300 py-12">
              {t('pricing.noPlansAvailable')}
            </div>
          )}
        </div>

        {/* Payment Methods Info */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-center gap-4 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Visa</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Mastercard</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.23A.932.932 0 0 1 5.865 1.5h7.334c2.51 0 4.086.725 4.686 2.155.277.662.361 1.39.25 2.165l-.013.082v.073c.55 2.88-1.248 4.875-4.924 4.875h-1.25a.932.932 0 0 0-.92.73l-.793 5.027-.226 1.43a.49.49 0 0 1-.484.4z"/>
              </svg>
              <span>PayPal</span>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="max-w-2xl mx-auto mb-16">
          <Card className="border border-orange-500/30 bg-gradient-to-r from-slate-800/50 to-slate-900/50 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500/20 to-orange-500/20 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">{t('pricing.needHelp')}</h3>
            <p className="text-cyan-300 mb-6">
              {t('pricing.helpDescription')}
            </p>
            <a
              href={language === 'ar'
                ? "mailto:info@mineuqr.com?subject=طلب اشتراك - mineuqr&body=مرحباً،%0A%0Aأرغب في الاشتراك في منصة mineuqr.%0A%0Aالاسم: %0Aاسم المطعم: %0Aالخطة المطلوبة: %0Aرقم الهاتف: %0A%0Aشكراً"
                : "mailto:info@mineuqr.com?subject=Subscription Request - mineuqr&body=Hello,%0A%0AI would like to subscribe to mineuqr platform.%0A%0AName: %0ARestaurant Name: %0APlan: %0APhone: %0A%0AThank you"
              }
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-slate-900 font-bold px-8 py-3 rounded-lg transition-all"
            >
              <Mail className="w-5 h-5" />
              {t('pricing.contactViaEmailFull')}
            </a>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">{t('pricing.faq')}</h2>
          <div className="space-y-4">
            <Card className="border border-cyan-500/30 bg-slate-800/30 p-6">
              <h3 className="text-lg font-semibold text-cyan-300 mb-2">
                {t('pricing.faqCancel')}
              </h3>
              <p className="text-cyan-200">
                {t('pricing.faqCancelAnswer')}
              </p>
            </Card>

            <Card className="border border-cyan-500/30 bg-slate-800/30 p-6">
              <h3 className="text-lg font-semibold text-cyan-300 mb-2">
                {t('pricing.faqTrial')}
              </h3>
              <p className="text-cyan-200">
                {t('pricing.faqTrialAnswer')}
              </p>
            </Card>

            <Card className="border border-cyan-500/30 bg-slate-800/30 p-6">
              <h3 className="text-lg font-semibold text-cyan-300 mb-2">
                {t('pricing.faqPayment')}
              </h3>
              <p className="text-cyan-200">
                {t('pricing.faqPaymentAnswer')}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
