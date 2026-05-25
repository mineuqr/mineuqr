import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import {
  QrCode, Smartphone, Palette, Globe, BarChart3, Shield,
  ArrowLeft, ChevronDown, Zap, Layers, Eye, Menu, X
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

const features = [
  {
    icon: QrCode,
    titleKey: "home.feature1Title",
    descKey: "home.feature1Desc",
    color: "text-primary",
  },
  {
    icon: Smartphone,
    titleKey: "home.feature2Title",
    descKey: "home.feature2Desc",
    color: "text-accent",
  },
  {
    icon: Palette,
    titleKey: "home.feature3Title",
    descKey: "home.feature3Desc",
    color: "text-primary",
  },
  {
    icon: Globe,
    titleKey: "home.feature4Title",
    descKey: "home.feature4Desc",
    color: "text-accent",
  },
  {
    icon: BarChart3,
    titleKey: "home.feature5Title",
    descKey: "home.feature5Desc",
    color: "text-primary",
  },
  {
    icon: Shield,
    titleKey: "home.feature6Title",
    descKey: "home.feature6Desc",
    color: "text-accent",
  },
];

const steps = [
  {
    num: "01",
    titleKey: "home.step1Title",
    descKey: "home.step1Desc",
    icon: Zap,
  },
  {
    num: "02",
    titleKey: "home.step2Title",
    descKey: "home.step2Desc",
    icon: Layers,
  },
  {
    num: "03",
    titleKey: "home.step3Title",
    descKey: "home.step3Desc",
    icon: Eye,
  },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t, language, setLanguage, dir } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen cinematic-bg text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16 gap-2">
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663504545475/fcy9GqTzfuy9H9eCsDbdLA/mineuqr-logo_150417d8.png"
              alt="mineuqr"
              className="h-14 w-auto object-contain"
            />
            <span className="text-2xl font-bold text-foreground hidden sm:inline">
              mine<span className="text-gradient-teal">uqr</span>
            </span>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-foreground hover:text-primary font-semibold"
            >
              {t('nav.home')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLocation("/pricing")}
              className="text-foreground hover:text-primary font-semibold"
            >
              {t('nav.pricing')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLocation("/contact")}
              className="text-foreground hover:text-primary font-semibold"
            >
              {t('nav.contact')}
            </Button>
            <div className="flex items-center gap-1 border border-border/30 rounded-lg p-1">
              <Button
                variant={language === 'ar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('ar')}
                className="text-xs font-semibold"
              >
                العربية
              </Button>
              <Button
                variant={language === 'en' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('en')}
                className="text-xs font-semibold"
              >
                English
              </Button>
            </div>
            {loading ? null : isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <Button
                    onClick={() => setLocation("/admin")}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  >
                    {t('nav.admin')}
                  </Button>
                )}
                <Button
                  onClick={() => setLocation("/dashboard")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {t('nav.dashboard')}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setLocation(getLoginUrl())}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {t('common.login')}
              </Button>
            )}
          </div>
          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-2">
            <div className="flex items-center gap-1 border border-border/30 rounded-lg p-1">
              <Button
                variant={language === 'ar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('ar')}
                className="text-xs font-semibold px-2 py-1 h-7"
              >
                ع
              </Button>
              <Button
                variant={language === 'en' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('en')}
                className="text-xs font-semibold px-2 py-1 h-7"
              >
                En
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-foreground p-2"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl px-4 py-4 space-y-2">
            <Button
              variant="ghost"
              onClick={() => { setLocation("/"); setMobileMenuOpen(false); }}
              className="w-full justify-start text-foreground hover:text-primary font-semibold"
            >
              {t('nav.home')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setLocation("/pricing"); setMobileMenuOpen(false); }}
              className="w-full justify-start text-foreground hover:text-primary font-semibold"
            >
              {t('nav.pricing')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setLocation("/contact"); setMobileMenuOpen(false); }}
              className="w-full justify-start text-foreground hover:text-primary font-semibold"
            >
              {t('nav.contact')}
            </Button>
            {loading ? null : isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <Button
                    onClick={() => { setLocation("/admin"); setMobileMenuOpen(false); }}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  >
                    {t('nav.admin')}
                  </Button>
                )}
                <Button
                  onClick={() => { setLocation("/dashboard"); setMobileMenuOpen(false); }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {t('nav.dashboard')}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => { setLocation(getLoginUrl()); setMobileMenuOpen(false); }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {t('common.login')}
              </Button>
            )}
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4">
        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute top-40 left-1/4 w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
        <div className="absolute top-60 right-1/3 w-1.5 h-1.5 rounded-full bg-accent/50 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-40 right-1/4 w-2.5 h-2.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: "2s" }} />

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-primary font-medium">{t('home.platformBadge')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight mb-6 text-white">
              {language === 'ar' ? (
                <>
                  حوّل منيو مطعمك
                  <br />
                  <span className="text-gradient-teal">إلى تجربة رقمية</span>
                  <br />
                  <span className="text-gradient-orange">استثنائية</span>
                </>
              ) : (
                <>
                  Transform Your Restaurant Menu
                  <br />
                  <span className="text-gradient-teal">Into an Exceptional</span>
                  <br />
                  <span className="text-gradient-orange">Digital Experience</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {t('home.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => {
                  if (isAuthenticated) setLocation("/dashboard");
                  else window.location.href = getLoginUrl();
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-6 rounded-xl glow-teal"
              >
                {t('common.startFree')}
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/pricing")}
              className="border-border/50 text-foreground hover:bg-secondary font-semibold text-lg px-8 py-6 rounded-xl"
            >
              {t('home.viewMenu')}
              <ChevronDown className="w-5 h-5 mr-2" />
            </Button>
            </div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-20 max-w-3xl mx-auto"
          >
            <div className="relative cinematic-card rounded-2xl p-8 glow-teal">
              <div className="grid grid-cols-3 gap-4">
                {/* Simulated menu preview */}
                <div className="col-span-2 space-y-3">
                  <div className="h-3 w-32 rounded-full bg-primary/30" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-12 h-12 rounded-lg bg-primary/20 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 w-24 rounded-full bg-foreground/20" />
                          <div className="h-2 w-16 rounded-full bg-muted-foreground/20" />
                        </div>
                        <div className="h-3 w-12 rounded-full bg-accent/30" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* QR Code preview */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-full aspect-square rounded-xl bg-white/10 border border-primary/20 flex items-center justify-center p-4">
                    <QrCode className="w-full h-full text-primary/60" />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2">{t('home.scanToPreview')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('home.allInOne')} <span className="text-gradient-teal">{language === 'ar' ? 'مكان واحد' : 'One Place'}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t('home.allInOneDesc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="cinematic-card rounded-xl p-6 hover:border-primary/40 transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{t(feature.titleKey)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(feature.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('home.howItWorks')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t('home.howItWorksDesc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="text-center relative"
              >
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-secondary border border-border/50 flex items-center justify-center mx-auto">
                    <step.icon className={`w-8 h-8 ${index % 2 === 0 ? "text-primary" : "text-accent"}`} />
                  </div>
                  <span className={`absolute -top-3 -right-3 text-sm font-black px-2.5 py-1 rounded-lg ${index % 2 === 0 ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}>
                    {step.num}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{t(step.titleKey)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(step.descKey)}</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 -left-4 w-8 h-0.5 bg-border/50" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="cinematic-card rounded-2xl p-8 sm:p-12 text-center max-w-3xl mx-auto glow-teal"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('home.ctaTitle')}
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
              {t('home.ctaDesc')}
            </p>
            <Button
              size="lg"
              onClick={() => {
                if (isAuthenticated) setLocation("/dashboard");
                else window.location.href = getLoginUrl();
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-10 py-6 rounded-xl"
            >
              {t('home.ctaButton')}
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663504545475/fcy9GqTzfuy9H9eCsDbdLA/mineuqr-logo_150417d8.png"
                alt="mineuqr"
                className="h-12 w-auto object-contain"
              />
              <span className="text-lg font-bold text-foreground">mineuqr</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="/about" onClick={(e) => { e.preventDefault(); setLocation("/about"); }} className="text-muted-foreground hover:text-primary transition-colors">
                {t('home.aboutUs')}
              </a>
              <a href="/terms" onClick={(e) => { e.preventDefault(); setLocation("/terms"); }} className="text-muted-foreground hover:text-primary transition-colors">
                {t('home.termsOfService')}
              </a>
              <a href="/privacy" onClick={(e) => { e.preventDefault(); setLocation("/privacy"); }} className="text-muted-foreground hover:text-primary transition-colors">
                {t('home.privacyPolicy')}
              </a>
              <a href="/pricing" onClick={(e) => { e.preventDefault(); setLocation("/pricing"); }} className="text-muted-foreground hover:text-primary transition-colors">
                {t('home.plans')}
              </a>
              <a href="/contact" onClick={(e) => { e.preventDefault(); setLocation("/contact"); }} className="text-muted-foreground hover:text-primary transition-colors">
                {t('home.contactUs')}
              </a>
              <div className="flex items-center gap-4">
                <a href="https://wa.me/963983933413" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/20 transition-colors" title="WhatsApp">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
                <a href="mailto:info@mineuqr.com" className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent hover:bg-accent/20 transition-colors" title={language === 'ar' ? 'البريد الإلكتروني' : 'Email'}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('home.allRightsReserved')} &copy; {new Date().getFullYear()} {t('home.qrMenu')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
