import { AuthGatePending, LoginRequiredCard, PageDataLoading } from "@/components/AuthGate";
import { CommercialEntitlementsDiagnostics } from "@/components/commercial";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { useCommercialEntitlements } from "@/hooks/useCommercialEntitlements";
import { useLanguage } from "@/contexts/LanguageContext";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { AlertCircle, Info } from "lucide-react";

/**
 * PG-1C.3A — read-only diagnostics for migration verification.
 * Does not gate actions or replace legacy subscription UI.
 */
export default function CommercialDiagnostics() {
  const gate = useAuthGate();
  const { language } = useLanguage();
  const uiLang = language === "ar" ? "ar" : "en";

  const { context, entitlements, isLoading, isError, error } = useCommercialEntitlements();

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showLoginRequired) {
    return <LoginRequiredCard />;
  }

  if (isLoading) {
    return <PageDataLoading />;
  }

  if (isEmailNotVerifiedError(error)) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <EmailVerificationBanner />
          <VerificationRequiredPanel variant="operations" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex max-w-md items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">{error?.message ?? "Failed to load entitlements"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-white">
            {uiLang === "ar" ? "تشخيص الاستحقاقات التجارية" : "Commercial entitlements diagnostics"}
          </h1>
          <p className="flex items-start gap-2 text-sm text-cyan-200/90">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            {uiLang === "ar"
              ? "عرض للقراءة فقط — لا يغيّر سلوك التطبيق أو بوابات الاشتراك الحالية."
              : "Read-only view — does not change app behavior or existing subscription gates."}
          </p>
        </header>

        <CommercialEntitlementsDiagnostics
          context={context}
          entitlements={entitlements}
          language={uiLang}
        />
      </div>
    </div>
  );
}
