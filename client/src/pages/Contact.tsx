import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { useMarketingDocumentMeta } from "@/components/landing/useMarketingDocumentMeta";
import { MINEUQR_BRAND_NAME, MINEUQR_LOGO_SRC } from "@/const/branding";
import {
  MINEUQR_PUBLIC_SUPPORT_EMAIL,
  MINEUQR_PUBLIC_WHATSAPP_E164,
} from "@/const/publicContact";
import { trpc } from "@/lib/trpc";
import { Mail, MapPin, Loader2, CheckCircle, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Contact() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, language, dir } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  useMarketingDocumentMeta({
    title: t("contact.title"),
    description: t("contact.subtitle"),
    path: "/contact",
  });

  const sendContactMutation = trpc.contact.send.useMutation({
    onSuccess: () => {
      toast.success(t("contact.successMessage") || "تم إرسال رسالتك بنجاح!");
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSubmitted(false), 3000);
    },
    onError: (error: any) => {
      const errorMsg =
        error?.message || t("contact.errorMessage") || "حدث خطأ في إرسال الرسالة";
      toast.error(errorMsg);
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error(t("contact.fillAllFields") || "يرجى ملء جميع الحقول");
      return;
    }

    sendContactMutation.mutate(formData);
  };

  const whatsappHref = `https://wa.me/${MINEUQR_PUBLIC_WHATSAPP_E164}`;

  return (
    <div className="min-h-screen cinematic-bg" dir={dir}>
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="brand-mark flex shrink-0 items-center gap-2 rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={language === "ar" ? "الصفحة الرئيسية" : "Go to homepage"}
          >
            <img
              src={MINEUQR_LOGO_SRC}
              alt={MINEUQR_BRAND_NAME}
              className="h-12 w-auto object-contain"
              draggable={false}
            />
            <span className="text-lg font-bold text-foreground">{MINEUQR_BRAND_NAME}</span>
          </button>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="font-semibold text-foreground hover:text-primary"
            >
              {t("nav.home") || (language === "ar" ? "الرئيسية" : "Home")}
            </Button>
            <LanguageSwitcher />
            <Button
              onClick={() => {
                if (isAuthenticated) setLocation("/dashboard");
                else setLocation(getLoginUrl());
              }}
              className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {isAuthenticated ? t("nav.dashboard") : t("common.login")}
            </Button>
          </div>
        </div>
      </nav>

      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-5xl">
              {t("contact.title") || "تواصل معنا"}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {t("contact.subtitle") ||
                "نحن هنا لمساعدتك. أرسل لنا رسالة وسنرد عليك في أسرع وقت"}
            </p>
          </div>

          <div className="mx-auto mb-12 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
            <Card className="border-border/50 bg-card transition-all hover:border-primary/50">
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">
                  {t("contact.email") || "البريد الإلكتروني"}
                </h3>
                <a
                  href={`mailto:${MINEUQR_PUBLIC_SUPPORT_EMAIL}`}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {MINEUQR_PUBLIC_SUPPORT_EMAIL}
                </a>
              </CardContent>
            </Card>

            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="h-full border-border/50 bg-card transition-all hover:border-[#25D366]/50">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#25D366]/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-6 w-6 text-[#25D366]"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-foreground">WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "تواصل عبر واتساب" : "Chat on WhatsApp"}
                  </p>
                </CardContent>
              </Card>
            </a>

            <Card className="border-border/50 bg-card transition-all hover:border-primary/50">
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">
                  {t("contact.location") || "Location"}
                </h3>
                <p className="text-sm text-muted-foreground">{t("contact.locationValue")}</p>
              </CardContent>
            </Card>
          </div>

          <div className="mx-auto max-w-2xl">
            <Card className="border-border/50 bg-card">
              <CardContent className="p-8">
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="py-12 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.2,
                          type: "spring",
                          stiffness: 200,
                          damping: 15,
                        }}
                        className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            delay: 0.4,
                            type: "spring",
                            stiffness: 250,
                            damping: 12,
                          }}
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/20"
                        >
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: 0.6,
                              type: "spring",
                              stiffness: 300,
                              damping: 10,
                            }}
                          >
                            <CheckCircle className="h-8 w-8 text-emerald-400" />
                          </motion.div>
                        </motion.div>
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0.5 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                          className="absolute inset-0 rounded-full border-2 border-emerald-400/30"
                        />
                      </motion.div>

                      <motion.h3
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.4 }}
                        className="mb-3 text-2xl font-bold text-foreground"
                      >
                        {t("contact.thankYou") || "شكراً لك!"}
                      </motion.h3>

                      <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.4 }}
                        className="mx-auto mb-6 max-w-md text-muted-foreground"
                      >
                        {t("contact.willReplyMessage") ||
                          "تم استقبال رسالتك. سنرد عليك قريباً"}
                      </motion.p>

                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1, duration: 0.4 }}
                      >
                        <Button
                          variant="outline"
                          onClick={() => setSubmitted(false)}
                          className="gap-2 border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10"
                        >
                          <Send className="h-4 w-4" />
                          {language === "ar" ? "إرسال رسالة أخرى" : "Send another message"}
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="contact-name"
                            className="mb-2 block text-sm font-medium text-foreground"
                          >
                            {t("contact.name") || "الاسم"}
                          </label>
                          <Input
                            id="contact-name"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={t("contact.namePlaceholder") || "أدخل اسمك"}
                            className="border-border/50 bg-background text-foreground placeholder:text-muted-foreground/50"
                            autoComplete="name"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="contact-email"
                            className="mb-2 block text-sm font-medium text-foreground"
                          >
                            {t("contact.email") || "البريد الإلكتروني"}
                          </label>
                          <Input
                            id="contact-email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder={
                              t("contact.emailPlaceholder") || "أدخل بريدك الإلكتروني"
                            }
                            className="border-border/50 bg-background text-foreground placeholder:text-muted-foreground/50"
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="contact-subject"
                          className="mb-2 block text-sm font-medium text-foreground"
                        >
                          {t("contact.subject") || "الموضوع"}
                        </label>
                        <Input
                          id="contact-subject"
                          type="text"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder={
                            t("contact.subjectPlaceholder") || "أدخل موضوع الرسالة"
                          }
                          className="border-border/50 bg-background text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contact-message"
                          className="mb-2 block text-sm font-medium text-foreground"
                        >
                          {t("contact.message") || "الرسالة"}
                        </label>
                        <Textarea
                          id="contact-message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder={
                            t("contact.messagePlaceholder") || "أدخل رسالتك هنا..."
                          }
                          rows={6}
                          className="resize-none border-border/50 bg-background text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={sendContactMutation.isPending}
                        className="w-full bg-gradient-to-r from-primary to-accent py-3 font-bold text-white hover:from-primary/90 hover:to-accent/90"
                      >
                        {sendContactMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("contact.sending") || "جاري الإرسال..."}
                          </>
                        ) : (
                          t("contact.send") || "إرسال الرسالة"
                        )}
                      </Button>
                    </form>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t border-border/30 py-12">
        <div className="container text-center">
          <p className="mb-4 text-muted-foreground">
            {t("contact.needHelp") || "هل تحتاج إلى مساعدة فورية؟"}
          </p>
          <Button
            onClick={() => window.open(whatsappHref, "_blank")}
            className="bg-[#25D366] font-bold text-white hover:bg-[#25D366]/90"
          >
            {t("contact.whatsapp") || "تواصل عبر WhatsApp"}
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
