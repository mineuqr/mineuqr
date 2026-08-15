import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { syncAuthAfterLogin } from "@/lib/authSession";
import { trpc } from "@/lib/trpc";
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
import {
  Mail,
  Lock,
  ArrowLeft,
  LogIn,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolvePostAuthPath } from "@/lib/commercial/commercialAccountState";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SERVER_INVALID_CREDENTIALS = "بيانات الدخول غير صحيحة";
const SERVER_RATE_LIMITED = "محاولات كثيرة. يرجى المحاولة لاحقاً";

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && EMAIL_PATTERN.test(trimmed);
}

function mapLoginError(
  status: number,
  serverError: string | undefined,
  retryAfterSec: number | undefined,
  t: (key: string) => string
): string {
  if (status === 429) {
    return retryAfterSec != null
      ? t("auth.loginRateLimited").replace("{seconds}", String(retryAfterSec))
      : t("auth.loginRateLimitedGeneric");
  }
  if (
    status === 401 ||
    serverError === SERVER_INVALID_CREDENTIALS
  ) {
    return t("auth.loginInvalidCredentials");
  }
  if (status === 400 && serverError?.trim()) {
    return serverError.trim();
  }
  if (status >= 500) {
    return t("auth.loginServerError");
  }
  if (serverError === SERVER_RATE_LIMITED) {
    return t("auth.loginRateLimitedGeneric");
  }
  return t("auth.loginUnexpectedError");
}

export default function SubscriberLogin() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const isRtl = language === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [oauthConflict, setOauthConflict] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") !== "oauth_email_conflict") return;
    setOauthConflict(true);
    setFormError(t("auth.oauthConflictMessage"));
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    const clean = url.pathname + (url.search || "");
    window.history.replaceState({}, "", clean);
  }, [t]);

  const iconInset = isRtl ? "right" : "left";
  const toggleInset = isRtl ? "left" : "right";
  const inputPaddingStart = isRtl ? "paddingRight" : "paddingLeft";
  const inputPaddingEnd = isRtl ? "paddingLeft" : "paddingRight";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setFormError(null);
    setOauthConflict(false);
    const nextFieldErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextFieldErrors.email = t("auth.loginEmailRequired");
    } else if (!isValidEmail(trimmedEmail)) {
      nextFieldErrors.email = t("auth.loginEmailInvalid");
    }
    if (!password) {
      nextFieldErrors.password = t("auth.loginPasswordRequired");
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    let navigated = false;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      let data: { error?: string; retryAfterSec?: number } = {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON body */
      }

      if (!res.ok) {
        setFormError(
          mapLoginError(res.status, data.error, data.retryAfterSec, t)
        );
        return;
      }

      const user = await syncAuthAfterLogin(utils);
      if (!user) {
        setFormError(t("auth.loginUnexpectedError"));
        return;
      }

      navigated = true;
      const returnTo = new URLSearchParams(window.location.search).get(
        "returnTo"
      );
      const safeReturnTo =
        returnTo &&
        returnTo.startsWith("/") &&
        !returnTo.startsWith("//") &&
        !returnTo.includes("://")
          ? returnTo
          : "/dashboard";
      let accountState: "ACTIVE" | "FROZEN" | "NONE" | null = null;
      try {
        const entitlements = await utils.commercial.getEntitlements.fetch();
        const raw = (entitlements.meta as { commercialAccountState?: string } | undefined)
          ?.commercialAccountState;
        if (raw === "ACTIVE" || raw === "FROZEN" || raw === "NONE") {
          accountState = raw;
        }
      } catch {
        accountState = null;
      }
      setLocation(resolvePostAuthPath({ accountState, requestedPath: safeReturnTo }));
    } catch {
      setFormError(t("auth.loginNetworkError"));
    } finally {
      if (!navigated) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-2 pb-2 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("auth.loginTitle")}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t("auth.loginSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {oauthConflict && (
                <Alert
                  className="border-amber-500/40 bg-amber-500/10"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle className="text-amber-600 dark:text-amber-400" aria-hidden />
                  <AlertTitle>{t("auth.oauthConflictTitle")}</AlertTitle>
                  <AlertDescription className="space-y-2 text-muted-foreground">
                    <p>{t("auth.oauthConflictMessage")}</p>
                    <p>{t("auth.oauthConflictRecovery")}</p>
                  </AlertDescription>
                </Alert>
              )}
              {formError && !oauthConflict && (
                <Alert
                  variant="destructive"
                  className="border-destructive/50"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle aria-hidden />
                  <AlertTitle>{t("auth.loginErrorTitle")}</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-foreground">
                  {t("auth.email")}
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute top-3 h-4 w-4 text-muted-foreground"
                    style={{ [iconInset]: "12px" }}
                    aria-hidden
                  />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (oauthConflict) setOauthConflict(false);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                      if (formError) setFormError(null);
                    }}
                    placeholder={t("auth.emailPlaceholder")}
                    className={cn(
                      "min-h-11 bg-input border-border text-foreground",
                      fieldErrors.email && "border-destructive"
                    )}
                    style={{ [inputPaddingStart]: "40px" }}
                    dir="ltr"
                    aria-invalid={fieldErrors.email ? true : undefined}
                    aria-describedby={
                      fieldErrors.email ? "login-email-error" : undefined
                    }
                    disabled={isLoading}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <p
                    id="login-email-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="login-password" className="text-foreground">
                    {t("auth.password")}
                  </Label>
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="min-h-10 shrink-0 rounded-sm px-1 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    disabled={isLoading}
                  >
                    {t("auth.forgotPasswordLink")}
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-3 h-4 w-4 text-muted-foreground"
                    style={{ [iconInset]: "12px" }}
                    aria-hidden
                  />
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                      }
                      if (formError) setFormError(null);
                    }}
                    placeholder={t("auth.passwordPlaceholder")}
                    className={cn(
                      "min-h-11 bg-input border-border text-foreground",
                      fieldErrors.password && "border-destructive"
                    )}
                    style={{
                      [inputPaddingStart]: "40px",
                      [inputPaddingEnd]: "44px",
                    }}
                    dir="ltr"
                    aria-invalid={fieldErrors.password ? true : undefined}
                    aria-describedby={
                      fieldErrors.password ? "login-password-error" : undefined
                    }
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className={cn(
                      "absolute top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    )}
                    style={{ [toggleInset]: "4px" }}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t("auth.loginHidePassword")
                        : t("auth.loginShowPassword")
                    }
                    aria-pressed={showPassword}
                    aria-controls="login-password"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p
                    id="login-password-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2
                      className="me-2 h-4 w-4 animate-spin"
                      aria-hidden
                    />
                    {t("auth.loggingIn")}
                  </>
                ) : (
                  <>
                    <LogIn className="me-2 h-4 w-4" aria-hidden />
                    {t("auth.loginButton")}
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-col gap-2 text-center sm:flex-row sm:justify-center sm:gap-4">
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 text-muted-foreground hover:text-foreground"
                onClick={() => setLocation("/register")}
                disabled={isLoading}
              >
                {t("auth.registerCta")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 text-muted-foreground hover:text-foreground"
                onClick={() => setLocation("/")}
                disabled={isLoading}
              >
                <ArrowLeft
                  className={cn("me-1 h-4 w-4", isRtl && "rotate-180")}
                  aria-hidden
                />
                {t("auth.backToHome")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
