import { useState, useEffect } from "react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AuthGatePending } from "@/components/AuthGate";
import { getLoginUrl, spaNavigate } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, Lock, Save, Loader2, Shield } from "lucide-react";
export default function Profile() {
  const gate = useAuthGate();
  const { user, isAuthenticated, authResolved } = gate;
  const { t, language } = useLanguage();
  const isRtl = language === "ar";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: profile, isLoading } = trpc.profile.get.useQuery(undefined, {
    enabled: authResolved && isAuthenticated,
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  const utils = trpc.useUtils();

  const updateProfileMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success(t('profile.updateSuccess'));
      utils.profile.get.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const changePasswordMutation = trpc.profile.changePassword.useMutation({
    onSuccess: () => {
      toast.success(t('profile.passwordChanged'));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (gate.isPending) {
    return <AuthGatePending minHeight="min-h-[60vh]" />;
  }

  if (gate.showLoginRequired) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">{t("common.loginRequired")}</h2>
            <p className="text-muted-foreground mb-6">{t("common.loginRequiredDesc")}</p>
            <Button onClick={() => spaNavigate(getLoginUrl())} className="w-full">
              {t("common.login")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleUpdateProfile = () => {
    if (!name.trim()) {
      toast.error(t('profile.nameRequired'));
      return;
    }
    updateProfileMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      toast.error(t('profile.currentPasswordRequired'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('profile.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const isLocalAuth = profile?.loginMethod === "email";

  return (
    <div className="container max-w-2xl py-8" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          {t('profile.title')}
        </h1>
        <p className="text-muted-foreground mt-2">{t('profile.subtitle')}</p>
      </div>

      {/* Profile Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('profile.personalInfo')}
          </CardTitle>
          <CardDescription>{t('profile.personalInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-foreground">{t('profile.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('profile.namePlaceholder')}
              className="mt-1 bg-input border-border text-foreground"
            />
          </div>
          <div>
            <Label className="text-foreground">{t('profile.email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('profile.emailPlaceholder')}
              className="mt-1 bg-input border-border text-foreground"
              dir="ltr"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>{t('profile.role')}: <strong className="text-foreground">{profile?.role === 'admin' ? t('profile.admin') : t('profile.user')}</strong></span>
          </div>
          <Button
            onClick={handleUpdateProfile}
            disabled={updateProfileMutation.isPending}
            className="w-full sm:w-auto"
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('profile.saveChanges')}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password Card - Only for local auth users */}
      {isLocalAuth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t('profile.changePassword')}
            </CardTitle>
            <CardDescription>{t('profile.changePasswordDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-foreground">{t('profile.currentPassword')}</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 bg-input border-border text-foreground"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-foreground">{t('profile.newPassword')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('profile.newPasswordPlaceholder')}
                className="mt-1 bg-input border-border text-foreground"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-foreground">{t('profile.confirmPassword')}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('profile.confirmPasswordPlaceholder')}
                className="mt-1 bg-input border-border text-foreground"
                dir="ltr"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              {t('profile.updatePassword')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
