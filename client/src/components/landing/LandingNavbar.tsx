import { useAuth } from "@/_core/hooks/useAuth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

const navLinks = [
  { href: "/", key: "nav.home" },
  { href: "/pricing", key: "nav.pricing" },
  { href: "/contact", key: "nav.contact" },
] as const;

export function LandingNavbar() {
  const { user, loading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (href: string) => {
    setLocation(href);
    setMobileOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="landing-glass border-b border-border/25">
        <div className="container flex h-[4.25rem] items-center justify-between gap-4 sm:h-[4.5rem]">
          <LandingLogo
            onClick={() => go("/")}
            imageClassName="h-10 w-auto sm:h-11 md:h-12"
            ariaLabel={t("nav.home")}
          />

          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => go(link.href)}
                className={cn(
                  "landing-nav-link",
                  location === link.href && "landing-nav-link-active"
                )}
              >
                {t(link.key)}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-2 sm:gap-3 lg:flex">
            <LanguageSwitcher variant="landing" />
            {loading ? (
              <div className="h-9 w-24" />
            ) : isAuthenticated ? (
              <>
                {user?.role === "admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => go("/admin")}
                    className="rounded-xl border-accent/30 bg-accent/10 text-accent-foreground hover:bg-accent/20"
                  >
                    {t("nav.admin")}
                  </Button>
                )}
                <Button size="sm" onClick={() => go("/dashboard")} className="landing-btn-primary h-9 px-4">
                  {t("nav.dashboard")}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => go(getLoginUrl())} className="landing-btn-primary h-9 px-4">
                {t("common.login")}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher variant="landing" compact />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-foreground"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-border/25 px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => go(link.href)}
                  className={cn(
                    "landing-nav-link w-full text-start",
                    location === link.href && "landing-nav-link-active"
                  )}
                >
                  {t(link.key)}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-border/25 pt-4">
              {loading ? null : isAuthenticated ? (
                <>
                  {user?.role === "admin" && (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => go("/admin")}
                    >
                      {t("nav.admin")}
                    </Button>
                  )}
                  <Button className="landing-btn-primary w-full" onClick={() => go("/dashboard")}>
                    {t("nav.dashboard")}
                  </Button>
                </>
              ) : (
                <Button className="landing-btn-primary w-full" onClick={() => go(getLoginUrl())}>
                  {t("common.login")}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
