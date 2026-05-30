import { useState } from "react";
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
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Store,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const VERIFY_HINT_STORAGE_KEY = "mineuqr_register_verify_hint";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const SERVER_DUPLICATE_EMAIL = "البريد الإلكتروني مستخدم بالفعل";
const SERVER_RATE_LIMITED = "محاولات كثيرة. يرجى المحاولة لاحقاً";

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && EMAIL_PATTERN.test(trimmed);
}

function mapRegisterError(
  status: number,
  serverError: string | undefined,
  retryAfterSec: number | undefined,
  t: (key: string) => string
): string {
  if (status === 429) {
    return retryAfterSec != null
      ? t("auth.registerRateLimited").replace("{seconds}", String(retryAfterSec))
      : t("auth.registerRateLimitedGeneric");
  }
  if (status === 409 || serverError === SERVER_DUPLICATE_EMAIL) {
    return t("auth.registerDuplicateEmail");
  }
  if (status === 400 && serverError?.trim()) {
    return serverError.trim();
  }
  if (status >= 500) {
    return t("auth.registerServerError");
  }
  if (serverError === SERVER_RATE_LIMITED) {
    return t("auth.registerRateLimitedGeneric");
  }
  return t("auth.registerUnexpectedError");
}

export default function Register() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const isRtl = language === "ar";

  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    restaurantName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const iconInset = isRtl ? "right" : "left";
  const toggleInset = isRtl ? "left" : "right";
  const inputPaddingStart = isRtl ? "paddingRight" : "paddingLeft";
  const inputPaddingEnd = isRtl ? "paddingLeft" : "paddingRight";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setFormError(null);

    const next: typeof fieldErrors = {};
    const trimmedRestaurant = restaurantName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedRestaurant) {
      next.restaurantName = t("auth.registerRestaurantRequired");
    }
    if (!trimmedEmail) {
      next.email = t("auth.registerEmailRequired");
    } else if (!isValidEmail(trimmedEmail)) {
      next.email = t("auth.registerEmailInvalid");
    }
    if (!password) {
      next.password = t("auth.registerPasswordRequired");
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = t("auth.registerPasswordMinLength");
    }
    if (!confirmPassword) {
      next.confirmPassword = t("auth.registerConfirmRequired");
    } else if (password !== confirmPassword) {
      next.confirmPassword = t("auth.registerPasswordMismatch");
    }

    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    let navigated = false;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          restaurantName: trimmedRestaurant,
          email: trimmedEmail,
          password,
        }),
      });

      let data: {
        error?: string;
        retryAfterSec?: number;
        success?: boolean;
        verificationEmailSent?: boolean;
      } = {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON */
      }

      if (!res.ok) {
        setFormError(mapRegisterError(res.status, data.error, data.retryAfterSec, t));
        return;
      }

      const user = await syncAuthAfterLogin(utils);
      if (!user) {
        setFormError(t("auth.registerUnexpectedError"));
        return;
      }

      if (data.verificationEmailSent !== false) {
        try {
          sessionStorage.setItem(VERIFY_HINT_STORAGE_KEY, "1");
        } catch {
          /* private mode */
        }
        toast.info(t("auth.registerVerifyHint"), { duration: 8000 });
      }

      navigated = true;
      setLocation("/dashboard");
    } catch {
      setFormError(t("auth.registerNetworkError"));
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
              {t("auth.registerTitle")}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t("auth.registerSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {formError && (
                <Alert
                  variant="destructive"
                  className="border-destructive/50"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle aria-hidden />
                  <AlertTitle>{t("auth.registerErrorTitle")}</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="register-restaurant" className="text-foreground">
                  {t("auth.registerRestaurantName")}
                </Label>
                <div className="relative">
                  <Store
                    className="pointer-events-none absolute top-3 h-4 w-4 text-muted-foreground"
                    style={{ [iconInset]: "12px" }}
                    aria-hidden
                  />
                  <Input
                    id="register-restaurant"
                    name="restaurantName"
                    type="text"
                    autoComplete="organization"
                    value={restaurantName}
                    onChange={(e) => {
                      setRestaurantName(e.target.value);
                      if (fieldErrors.restaurantName) {
                        setFieldErrors((p) => ({
                          ...p,
                          restaurantName: undefined,
                        }));
                      }
                      if (formError) setFormError(null);
                    }}
                    placeholder={t("auth.registerRestaurantPlaceholder")}
                    className={cn(
                      "min-h-11 bg-input border-border text-foreground",
                      fieldErrors.restaurantName && "border-destructive"
                    )}
                    style={{ [inputPaddingStart]: "40px" }}
                    aria-invalid={fieldErrors.restaurantName ? true : undefined}
                    aria-describedby={
                      fieldErrors.restaurantName
                        ? "register-restaurant-error"
                        : undefined
                    }
                    disabled={isLoading}
                    required
                  />
                </div>
                {fieldErrors.restaurantName && (
                  <p
                    id="register-restaurant-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.restaurantName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-foreground">
                  {t("auth.email")}
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute top-3 h-4 w-4 text-muted-foreground"
                    style={{ [iconInset]: "12px" }}
                    aria-hidden
                  />
                  <Input
                    id="register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((p) => ({ ...p, email: undefined }));
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
                      fieldErrors.email ? "register-email-error" : undefined
                    }
                    disabled={isLoading}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <p
                    id="register-email-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-foreground">
                  {t("auth.password")}
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-3 h-4 w-4 text-muted-foreground"
                    style={{ [iconInset]: "12px" }}
                    aria-hidden
                  />
                  <Input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((p) => ({ ...p, password: undefined }));
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
                      fieldErrors.password ? "register-password-error" : undefined
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
                    aria-controls="register-password"
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
                    id="register-password-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm" className="text-foreground">
                  {t("auth.confirmPassword")}
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-3 h-4 w-4 text-muted-foreground"
                    style={{ [iconInset]: "12px" }}
                    aria-hidden
                  />
                  <Input
                    id="register-confirm"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((p) => ({
                          ...p,
                          confirmPassword: undefined,
                        }));
                      }
                      if (formError) setFormError(null);
                    }}
                    placeholder={t("auth.resetPasswordConfirmPlaceholder")}
                    className={cn(
                      "min-h-11 bg-input border-border text-foreground",
                      fieldErrors.confirmPassword && "border-destructive"
                    )}
                    style={{
                      [inputPaddingStart]: "40px",
                      [inputPaddingEnd]: "44px",
                    }}
                    dir="ltr"
                    aria-invalid={
                      fieldErrors.confirmPassword ? true : undefined
                    }
                    aria-describedby={
                      fieldErrors.confirmPassword
                        ? "register-confirm-error"
                        : undefined
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
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword
                        ? t("auth.loginHidePassword")
                        : t("auth.loginShowPassword")
                    }
                    aria-pressed={showConfirmPassword}
                    aria-controls="register-confirm"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p
                    id="register-confirm-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.confirmPassword}
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
                    {t("auth.registerSubmitting")}
                  </>
                ) : (
                  <>
                    <UserPlus className="me-2 h-4 w-4" aria-hidden />
                    {t("auth.registerSubmit")}
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-col gap-2 text-center sm:flex-row sm:justify-center sm:gap-4">
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 text-muted-foreground hover:text-foreground"
                onClick={() => setLocation("/login")}
                disabled={isLoading}
              >
                {t("auth.registerHasAccount")}
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
