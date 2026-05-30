import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
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
  ArrowLeft,
  CheckCircle2,
  Lock,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 6;
/** Matches server isPlausibleOneTimeTokenFromBody (do not log token). */
const MIN_TOKEN_LENGTH = 20;

const SERVER_RESET_INVALID = "الرابط غير صالح";
const SERVER_RESET_EXPIRED = "انتهت صلاحية الرابط";

function getTokenFromSearch(search: string): string {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(query).get("token")?.trim() ?? "";
}

function mapResetPasswordError(
  status: number,
  serverError: string | undefined,
  t: (key: string) => string
): string {
  if (status === 429) {
    return t("auth.resetPasswordRateLimitedGeneric");
  }
  if (serverError === SERVER_RESET_EXPIRED) {
    return t("auth.resetPasswordTokenExpired");
  }
  if (serverError === SERVER_RESET_INVALID) {
    return t("auth.resetPasswordTokenInvalid");
  }
  if (status === 400) {
    return serverError?.trim() || t("auth.resetPasswordTokenInvalid");
  }
  if (status >= 500) {
    return t("auth.resetPasswordServerError");
  }
  return t("auth.resetPasswordUnexpectedError");
}

export default function ResetPassword() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isRtl = language === "ar";

  const token = useMemo(() => getTokenFromSearch(search), [search]);
  const hasValidToken = token.length >= MIN_TOKEN_LENGTH;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const iconInset = isRtl ? "right" : "left";
  const inputPadding = isRtl ? "paddingRight" : "paddingLeft";

  const validateFields = (): boolean => {
    const next: { newPassword?: string; confirmPassword?: string } = {};
    if (!newPassword) {
      next.newPassword = t("auth.resetPasswordRequired");
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      next.newPassword = t("auth.resetPasswordMinLength");
    }
    if (!confirmPassword) {
      next.confirmPassword = t("auth.resetPasswordConfirmRequired");
    } else if (newPassword !== confirmPassword) {
      next.confirmPassword = t("auth.resetPasswordMismatch");
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!hasValidToken) {
      setFormError(t("auth.resetPasswordTokenMissing"));
      return;
    }
    if (!validateFields()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      let data: { error?: string; retryAfterSec?: number; success?: boolean } =
        {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON */
      }

      if (res.status === 429) {
        const sec = data.retryAfterSec;
        setFormError(
          sec != null
            ? t("auth.resetPasswordRateLimited").replace("{seconds}", String(sec))
            : t("auth.resetPasswordRateLimitedGeneric")
        );
        return;
      }

      if (!res.ok) {
        setFormError(mapResetPasswordError(res.status, data.error, t));
        return;
      }

      setSucceeded(true);
    } catch {
      setFormError(t("auth.resetPasswordNetworkError"));
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
              {t("auth.resetPasswordTitle")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {succeeded
                ? t("auth.resetPasswordSuccessSubtitle")
                : hasValidToken
                  ? t("auth.resetPasswordSubtitle")
                  : t("auth.resetPasswordMissingTokenSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {succeeded ? (
              <div className="space-y-4" aria-live="polite">
                <Alert className="border-primary/30 bg-primary/5 text-foreground">
                  <CheckCircle2 className="text-primary" aria-hidden />
                  <AlertTitle>{t("auth.resetPasswordSuccessTitle")}</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    {t("auth.resetPasswordSuccessMessage")}
                  </AlertDescription>
                </Alert>
                <Button
                  type="button"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setLocation("/login")}
                >
                  {t("auth.resetPasswordBackToLogin")}
                </Button>
              </div>
            ) : !hasValidToken ? (
              <div className="space-y-4" aria-live="polite">
                <Alert
                  variant="destructive"
                  className="border-destructive/50"
                  role="alert"
                >
                  <AlertCircle aria-hidden />
                  <AlertTitle>{t("auth.resetPasswordErrorTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("auth.resetPasswordTokenMissing")}
                  </AlertDescription>
                </Alert>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border"
                  onClick={() => setLocation("/forgot-password")}
                >
                  {t("auth.forgotPasswordLink")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setLocation("/login")}
                >
                  <ArrowLeft
                    className={cn("h-4 w-4 me-1", isRtl && "rotate-180")}
                    aria-hidden
                  />
                  {t("auth.resetPasswordBackToLogin")}
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
                    <AlertTitle>{t("auth.resetPasswordErrorTitle")}</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-foreground">
                    {t("auth.newPassword")}
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute top-3 text-muted-foreground h-4 w-4 pointer-events-none"
                      style={{ [iconInset]: "12px" }}
                      aria-hidden
                    />
                    <Input
                      id="new-password"
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (fieldErrors.newPassword) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            newPassword: undefined,
                          }));
                        }
                      }}
                      placeholder={t("auth.resetPasswordNewPlaceholder")}
                      className={cn(
                        "bg-input border-border text-foreground",
                        fieldErrors.newPassword && "border-destructive"
                      )}
                      style={{ [inputPadding]: "40px" }}
                      dir="ltr"
                      aria-invalid={fieldErrors.newPassword ? true : undefined}
                      aria-describedby={
                        fieldErrors.newPassword ? "new-password-error" : undefined
                      }
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.newPassword && (
                    <p
                      id="new-password-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {fieldErrors.newPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-foreground">
                    {t("auth.confirmPassword")}
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute top-3 text-muted-foreground h-4 w-4 pointer-events-none"
                      style={{ [iconInset]: "12px" }}
                      aria-hidden
                    />
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            confirmPassword: undefined,
                          }));
                        }
                      }}
                      placeholder={t("auth.resetPasswordConfirmPlaceholder")}
                      className={cn(
                        "bg-input border-border text-foreground",
                        fieldErrors.confirmPassword && "border-destructive"
                      )}
                      style={{ [inputPadding]: "40px" }}
                      dir="ltr"
                      aria-invalid={
                        fieldErrors.confirmPassword ? true : undefined
                      }
                      aria-describedby={
                        fieldErrors.confirmPassword
                          ? "confirm-password-error"
                          : undefined
                      }
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p
                      id="confirm-password-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  <KeyRound className="h-4 w-4 me-2" aria-hidden />
                  {isLoading
                    ? t("auth.resetPasswordSubmitting")
                    : t("auth.resetPasswordSubmit")}
                </Button>

                <div className="flex flex-col gap-2 text-center sm:flex-row sm:justify-center sm:gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setLocation("/forgot-password")}
                  >
                    {t("auth.forgotPasswordLink")}
                  </Button>
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
                    {t("auth.resetPasswordBackToLogin")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
