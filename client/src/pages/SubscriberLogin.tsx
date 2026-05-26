import { useState } from "react";
import { useLocation } from "wouter";
import { syncAuthAfterLogin } from "@/lib/authSession";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mail, Lock, ArrowLeft, LogIn } from "lucide-react";

export default function SubscriberLogin() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("auth.loginError"));
        return;
      }

      toast.success(t("auth.loginSuccess"));

      const user = await syncAuthAfterLogin(utils);
      if (!user) {
        toast.error(t("auth.loginError"));
        return;
      }

      setLocation("/dashboard");
    } catch (error) {
      toast.error(t("auth.loginError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              {t("auth.loginTitle")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("auth.loginSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  {t("auth.email")}
                </Label>
                <div className="relative">
                  <Mail className="absolute top-3 text-muted-foreground h-4 w-4" style={{ [language === 'ar' ? 'right' : 'left']: '12px' }} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    className="bg-input border-border text-foreground"
                    style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  {t("auth.password")}
                </Label>
                <div className="relative">
                  <Lock className="absolute top-3 text-muted-foreground h-4 w-4" style={{ [language === 'ar' ? 'right' : 'left']: '12px' }} />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="bg-input border-border text-foreground"
                    style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                <LogIn className="h-4 w-4 me-2" />
                {isLoading ? t("auth.loggingIn") : t("auth.loginButton")}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft className="h-4 w-4 me-1" />
                {t("auth.backToHome")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
