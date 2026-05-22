import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { trpc } from "@/lib/trpc";
import { Mail, Loader2, CheckCircle, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Contact() {
  const [, setLocation] = useLocation();
  const { t, language, dir } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const sendContactMutation = trpc.contact.send.useMutation({
    onSuccess: () => {
      toast.success(t("contact.successMessage") || "تم إرسال رسالتك بنجاح!");
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSubmitted(false), 3000);
    },
    onError: (error: any) => {
      const errorMsg = error?.message || t("contact.errorMessage") || "حدث خطأ في إرسال الرسالة";
      toast.error(errorMsg);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  return (
    <div className="min-h-screen cinematic-bg" dir={dir}>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663504545475/fcy9GqTzfuy9H9eCsDbdLA/mineuqr-logo_150417d8.png"
              alt="mineuqr"
              className="h-12 w-auto object-contain"
            />
            <span className="text-lg font-bold text-foreground">mineuqr</span>
          </button>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
              {t("contact.title") || "تواصل معنا"}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("contact.subtitle") || "نحن هنا لمساعدتك. أرسل لنا رسالة وسنرد عليك في أسرع وقت"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 max-w-2xl mx-auto">
            {/* Contact Info Cards */}
            <Card className="bg-card border-border/50 hover:border-primary/50 transition-all">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {t("contact.email") || "البريد الإلكتروني"}
                </h3>
                <a
                  href="mailto:info@mineuqr.com"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  info@mineuqr.com
                </a>
              </CardContent>
            </Card>

            <a
              href="https://wa.me/963983933413"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="bg-card border-border/50 hover:border-[#25D366]/50 transition-all h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    WhatsApp
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {language === 'ar' ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
                  </p>
                </CardContent>
              </Card>
            </a>
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <Card className="bg-card border-border/50">
              <CardContent className="p-8">
                <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="text-center py-12"
                  >
                    {/* Animated checkmark circle */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                      className="w-20 h-20 rounded-full bg-emerald-400/15 flex items-center justify-center mx-auto mb-6 relative"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: "spring", stiffness: 250, damping: 12 }}
                        className="w-14 h-14 rounded-full bg-emerald-400/20 flex items-center justify-center"
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 10 }}
                        >
                          <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </motion.div>
                      </motion.div>
                      {/* Pulse ring */}
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border-2 border-emerald-400/30"
                      />
                    </motion.div>

                    {/* Title */}
                    <motion.h3
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7, duration: 0.4 }}
                      className="text-2xl font-bold text-foreground mb-3"
                    >
                      {t("contact.thankYou") || "شكراً لك!"}
                    </motion.h3>

                    {/* Message */}
                    <motion.p
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9, duration: 0.4 }}
                      className="text-muted-foreground mb-6 max-w-md mx-auto"
                    >
                      {t("contact.willReplyMessage") || "تم استقبال رسالتك. سنرد عليك قريباً"}
                    </motion.p>

                    {/* Send another message button */}
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
                        <Send className="w-4 h-4" />
                        {language === 'ar' ? 'إرسال رسالة أخرى' : 'Send another message'}
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t("contact.name") || "الاسم"}
                        </label>
                        <Input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={t("contact.namePlaceholder") || "أدخل اسمك"}
                          className="bg-background border-border/50 text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t("contact.email") || "البريد الإلكتروني"}
                        </label>
                        <Input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder={t("contact.emailPlaceholder") || "أدخل بريدك الإلكتروني"}
                          className="bg-background border-border/50 text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t("contact.subject") || "الموضوع"}
                      </label>
                      <Input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder={t("contact.subjectPlaceholder") || "أدخل موضوع الرسالة"}
                        className="bg-background border-border/50 text-foreground placeholder:text-muted-foreground/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t("contact.message") || "الرسالة"}
                      </label>
                      <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={t("contact.messagePlaceholder") || "أدخل رسالتك هنا..."}
                        rows={6}
                        className="bg-background border-border/50 text-foreground placeholder:text-muted-foreground/50 resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={sendContactMutation.isPending}
                      className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold py-3"
                    >
                      {sendContactMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

      {/* Footer CTA */}
      <section className="py-12 border-t border-border/30">
        <div className="container text-center">
          <p className="text-muted-foreground mb-4">
            {t("contact.needHelp") || "هل تحتاج إلى مساعدة فورية؟"}
          </p>
          <Button
            onClick={() => window.open("https://wa.me/963983933413", "_blank")}
            className="bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold"
          >
            {t("contact.whatsapp") || "تواصل عبر WhatsApp"}
          </Button>
        </div>
      </section>
    </div>
  );
}
