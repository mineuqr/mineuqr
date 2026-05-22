import { motion } from "framer-motion";
import {
  QrCode, Target, Eye, Heart, Rocket, Users, Globe, Shield,
  ArrowLeft, Lightbulb, Award, Zap, UtensilsCrossed, LayoutGrid, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { trpc } from "@/lib/trpc";

export default function About() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();

  const values = [
    {
      icon: Lightbulb,
      titleKey: "about.values.innovation.title",
      descKey: "about.values.innovation.desc",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Heart,
      titleKey: "about.values.simplicity.title",
      descKey: "about.values.simplicity.desc",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: Shield,
      titleKey: "about.values.reliability.title",
      descKey: "about.values.reliability.desc",
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
    },
    {
      icon: Users,
      titleKey: "about.values.customer.title",
      descKey: "about.values.customer.desc",
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
  ];

  const { data: publicStats, isLoading: statsLoading } = trpc.publicStats.get.useQuery();

  const stats = [
    { number: publicStats?.totalRestaurants?.toString() || "0", labelKey: "about.stats.restaurants", icon: UtensilsCrossed },
    { number: publicStats?.totalUsers?.toString() || "0", labelKey: "about.stats.users", icon: Users },
    { number: publicStats?.totalMenuItems?.toString() || "0", labelKey: "about.stats.menuItems", icon: LayoutGrid },
    { number: "24/7", labelKey: "about.stats.support", icon: Globe },
  ];

  const milestones = [
    {
      year: "2024",
      titleKey: "about.milestones.2024.title",
      descKey: "about.milestones.2024.desc",
    },
    {
      year: "2025",
      titleKey: "about.milestones.2025.title",
      descKey: "about.milestones.2025.desc",
    },
    {
      year: "2026",
      titleKey: "about.milestones.2026.title",
      descKey: "about.milestones.2026.desc",
    },
  ];

  return (
    <div className="min-h-screen cinematic-bg text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation("/")}>
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663504545475/fcy9GqTzfuy9H9eCsDbdLA/mineuqr-logo_150417d8.png"
              alt="mineuqr"
              className="h-14 w-auto object-contain"
            />
            <span className="text-2xl font-bold text-foreground">
              mine<span className="text-gradient-teal">uqr</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setLocation("/pricing")}
              className="text-foreground hover:text-primary font-semibold"
            >
              {t("common.pricing")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLocation("/about")}
              className="text-primary font-semibold"
            >
              {t("common.about")}
            </Button>
            <Button
              onClick={() => {
                if (isAuthenticated) setLocation("/dashboard");
                else window.location.href = getLoginUrl();
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isAuthenticated ? t("common.dashboard") : t("common.startNow")}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-primary font-medium">{t("about.hero.badge")}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6 text-white">
              {t("about.hero.title")}
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("about.hero.description")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
        <div className="container relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="cinematic-card rounded-2xl p-8 hover:border-primary/40 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">{t("about.vision.title")}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.vision.description")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="cinematic-card rounded-2xl p-8 hover:border-accent/40 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">{t("about.mission.title")}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.mission.description")}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 relative">
        <div className="container relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white mb-1">
                  {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /> : stat.number}
                </div>
                <div className="text-sm text-muted-foreground">{t(stat.labelKey)}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t("about.values.title")} <span className="text-gradient-teal">{t("about.values.subtitle")}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t("about.values.description")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="cinematic-card rounded-xl p-6 text-center hover:border-primary/30 transition-all duration-300 group"
              >
                <div className={`w-14 h-14 rounded-xl ${value.bgColor} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <value.icon className={`w-7 h-7 ${value.color}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{t(value.titleKey)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(value.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline / Milestones */}
      <section className="py-20 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t("about.timeline.title")} <span className="text-gradient-orange">{t("about.timeline.subtitle")}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t("about.timeline.description")}
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto relative">
            {/* Timeline line */}
            <div className="absolute top-0 bottom-0 right-[23px] md:right-1/2 w-0.5 bg-border/30 transform md:-translate-x-1/2" />

            {milestones.map((milestone, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? 30 : -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className={`relative flex items-start gap-6 mb-12 ${index % 2 === 0 ? "md:flex-row-reverse md:text-right" : "md:text-left"} flex-row`}
              >
                {/* Dot */}
                <div className="absolute right-[15px] md:right-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background transform md:-translate-x-1/2 mt-1.5 z-10" />

                {/* Content */}
                <div className="flex-1 cinematic-card rounded-xl p-6">
                  <div className="text-sm font-bold text-primary mb-2">{milestone.year}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{t(milestone.titleKey)}</h3>
                  <p className="text-muted-foreground">{t(milestone.descKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {language === 'ar' ? 'تواصل ' : 'Contact '}
              <span className="text-gradient-teal">{language === 'ar' ? 'معنا' : 'Us'}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {language === 'ar' ? 'نحن هنا لمساعدتك. تواصل معنا عبر أي من القنوات التالية' : 'We are here to help. Reach out to us through any of the following channels'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <motion.a
              href="https://wa.me/963983933413"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="cinematic-card rounded-xl p-6 text-center hover:border-[#25D366]/40 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-xl bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">WhatsApp</h3>
              <p className="text-muted-foreground text-sm">{language === 'ar' ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}</p>
            </motion.a>

            <motion.a
              href="mailto:info@mineuqr.com"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="cinematic-card rounded-xl p-6 text-center hover:border-accent/40 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-accent">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</h3>
              <p className="text-muted-foreground text-sm">info@mineuqr.com</p>
            </motion.a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              {t("about.cta.title")}
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              {t("about.cta.description")}
            </p>
            <Button
              onClick={() => {
                if (isAuthenticated) setLocation("/dashboard");
                else window.location.href = getLoginUrl();
              }}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold px-8 py-3"
            >
              {t("about.cta.button")}
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
