import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, CheckCircle2, Mail, Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && EMAIL_PATTERN.test(trimmed);
}

export default function ForgotPassword() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const isRtl = language === "ar";

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const iconInset = isRtl ? "right" : "left";
  const inputPadding = isRtl ? "paddingRight" : "paddingLeft";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError(t("auth.forgotPasswordEmailRequired"));
      return;
    }
    if (!isValidEmail(trimmed)) {
      setFieldError(t("auth.forgotPasswordEmailInvalid"));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      let data: { error?: string; retryAfterSec?: number } = {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON body */
      }

      if (res.status === 429) {
        const sec = data.retryAfterSec;
        setFormError(
          sec != null
            ? t("auth.forgotPasswordRateLimited").replace("{seconds}", String(sec))
            : t("auth.forgotPasswordRateLimitedGeneric")
        );
        return;
      }

      if (!res.ok && res.status >= 500) {
        setFormError(t("auth.forgotPasswordServerError"));
        return;
      }

      if (!res.ok) {
        setFormError(t("auth.forgotPasswordUnexpectedError"));
        return;
      }

      setSubmitted(true);
    } catch {
      setFormError(t("auth.forgotPasswordNetworkError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md">
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              {t("auth.forgotPasswordTitle")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {submitted
                ? t("auth.forgotPasswordSuccessSubtitle")
                : t("auth.forgotPasswordSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4" aria-live="polite">
                <Alert className="border-primary/30 bg-primary/5 text-foreground">
                  <CheckCircle2 className="text-primary" aria-hidden />
                  <AlertTitle>{t("auth.forgotPasswordSuccessTitle")}</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    {t("auth.forgotPasswordSuccessMessage")}
                  </AlertDescription>
                </Alert>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border"
                  onClick={() => setLocation("/login")}
                >
                  <ArrowLeft
                    className={cn("h-4 w-4", isRtl && "rotate-180")}
                    aria-hidden
                  />
                  <span className="ms-2">{t("auth.backToLogin")}</span>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {formError && (
                  <Alert
                    variant="destructive"
                    className="border-destructive/50"
                    role="alert"
                    aria-live="assertive"
                  >
                    <AlertCircle aria-hidden />
                    <AlertTitle>{t("auth.forgotPasswordErrorTitle")}</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-foreground">
                    {t("auth.email")}
                  </Label>
                  <div className="relative">
                    <Mail
                      className="absolute top-3 text-muted-foreground h-4 w-4 pointer-events-none"
                      style={{ [iconInset]: "12px" }}
                      aria-hidden
                    />
                    <Input
                      id="forgot-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldError) setFieldError(null);
                      }}
                      placeholder={t("auth.emailPlaceholder")}
                      className={cn(
                        "bg-input border-border text-foreground",
                        fieldError && "border-destructive"
                      )}
                      style={{ [inputPadding]: "40px" }}
                      dir="ltr"
                      aria-invalid={fieldError ? true : undefined}
                      aria-describedby={
                        fieldError ? "forgot-email-error" : undefined
                      }
                      disabled={isLoading}
                    />
                  </div>
                  {fieldError && (
                    <p
                      id="forgot-email-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {fieldError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  <Send className="h-4 w-4 me-2" aria-hidden />
                  {isLoading
                    ? t("auth.forgotPasswordSending")
                    : t("auth.forgotPasswordSubmit")}
                </Button>
              </form>
            )}

            {!submitted && (
              <div className="mt-4 flex flex-col gap-2 text-center sm:flex-row sm:justify-center sm:gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setLocation("/login")}
                >
                  <ArrowLeft
                    className={cn("h-4 w-4 me-1", isRtl && "rotate-180")}
                    aria-hidden
                  />
                  {t("auth.backToLogin")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setLocation("/")}
                >
                  {t("auth.backToHome")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
