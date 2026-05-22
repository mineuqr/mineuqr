import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, ArrowRight, Check, Lock, Crown, Sparkles,
  Palette, Store, Eye
} from "lucide-react";
import { TEMPLATES, type TemplateId } from "@/components/MenuTemplates";
import { Link } from "wouter";
import ColorCustomizer from "@/components/ColorCustomizer";
import FontCustomizer from "@/components/FontCustomizer";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TemplateSelector() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { t, language, dir } = useLanguage();
  const [, params] = useRoute("/dashboard/templates/:restaurantId");
  const restaurantId = Number(params?.restaurantId) || 0;
  const [, setLocation] = useLocation();

  const { data: restaurant, isLoading: restaurantLoading, error: restaurantError, refetch: refetchRestaurant } = trpc.restaurant.getById.useQuery(
    { id: restaurantId },
    { enabled: !!restaurantId && isAuthenticated }
  );

  const { data: subscriptionData, error: subscriptionError } = trpc.subscription.checkTrialStatus.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const utils = trpc.useUtils();
  const updateTemplateMutation = trpc.restaurant.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success(t('template.templateUpdated'));
      utils.restaurant.getById.invalidate({ id: restaurantId });
      utils.restaurant.getBySlug.invalidate();
      refetchRestaurant();
    },
    onError: (error) => {
      if (error.message.includes("المدفوعة")) {
        toast.error(t('template.templatePremiumOnly'), {
          action: {
            label: t('template.viewPlans'),
            onClick: () => setLocation("/pricing"),
          },
        });
      } else {
        toast.error(error.message);
      }
    },
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    if (restaurant && !selectedTemplate) {
      setSelectedTemplate((restaurant as any).menuTemplate || "classic");
    }
  }, [restaurant]);

  const isSubscribed = (subscriptionData?.isActive || false) || (user?.role === "admin");

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleApplyTemplate = () => {
    if (!restaurantId) return;
    updateTemplateMutation.mutate({
      id: restaurantId,
      menuTemplate: selectedTemplate as any,
    });
  };

  if (authLoading || restaurantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={dir}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">{t('template.loginRequired')}</h2>

          <Button
  disabled
  className="bg-primary opacity-50 cursor-not-allowed"
>
  <ArrowRight className="w-4 h-4 ml-2" />
  {t('template.login')}
</Button>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={dir}>
        <div className="text-center">
          <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('template.restaurantNotFound')}</h2>
          <p className="text-muted-foreground mb-4">{t('template.restaurantNotFoundDesc')}</p>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowRight className="w-4 h-4 ml-2" />
              {t('template.backToDashboard')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <header className="sticky top-0 z-40 border-b border-border/30 bg-background/95 backdrop-blur-sm">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowRight className="w-4 h-4" />
                {t('common.back')}
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{t('template.chooseTemplate')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {restaurant && (restaurant as any).slug && (
              <a href={`/menu/${(restaurant as any).slug}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 ml-1" />
                  {t('template.previewMenu')}
                </Button>
              </a>
            )}
            <Button
              onClick={handleApplyTemplate}
              disabled={updateTemplateMutation.isPending || selectedTemplate === ((restaurant as any).menuTemplate || "classic")}
              className="bg-primary hover:bg-primary/90"
            >
              {updateTemplateMutation.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 ml-2" />
              )}
              {t('template.applyTemplate')}
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="cinematic-card rounded-xl p-4 mb-8 flex items-center gap-4">
          {(restaurant as any).logoUrl ? (
            <img src={(restaurant as any).logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
          )}
          <div>
            <h2 className="font-bold text-foreground">{(restaurant as any).nameAr}</h2>
            <p className="text-sm text-muted-foreground">
              {t('template.currentTemplate')}: <span className="text-primary font-medium">
                {TEMPLATES.find(t => t.id === ((restaurant as any).menuTemplate || "classic"))?.nameAr || "كلاسيكي"}
              </span>
            </p>
          </div>
        </div>

        {/* Subscription Notice */}
        {!isSubscribed && (
          <div className="mb-8 p-4 rounded-xl border border-accent/30 bg-accent/5">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-accent shrink-0" />
              <div>
                <p className="font-bold text-foreground">{t('template.premiumNotice')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('template.premiumNoticeDesc')}
                  <Link href="/pricing" className="text-primary hover:underline mr-1">{t('template.viewPlans')}</Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {TEMPLATES.map((template, index) => {
            const isSelected = selectedTemplate === template.id;
            const isLocked = template.isPremium && !isSubscribed;
            const isCurrent = ((restaurant as any).menuTemplate || "classic") === template.id;

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              >
                <button
                  onClick={() => !isLocked && handleSelectTemplate(template.id)}
                  disabled={isLocked}
                  className={`w-full text-right rounded-2xl overflow-hidden transition-all duration-300 ${
                    isSelected
                      ? "ring-2 ring-primary shadow-[0_0_20px_rgba(20,184,166,0.2)] scale-[1.02]"
                      : isLocked
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:scale-[1.01] hover:shadow-xl"
                  }`}
                >
                  {/* Template Preview */}
                  <div
                    className="h-48 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${template.colors.bg.split(" ")[0].replace("from-[", "").replace("]", "")} 0%, ${template.colors.bg.split(" ")[1]?.replace("to-[", "").replace("]", "") || "#000"} 100%)` }}
                  >
                    <div className="absolute inset-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg" style={{ background: `${template.colors.accent}30` }} />
                        <div>
                          <div className="h-2.5 w-20 rounded-full bg-white/40" />
                          <div className="h-2 w-14 rounded-full bg-white/20 mt-1" />
                        </div>
                      </div>
                      <div className="flex gap-1.5 mb-2">
                        <div className="h-5 w-12 rounded-full" style={{ background: template.colors.accent }} />
                        <div className="h-5 w-14 rounded-full bg-white/10" />
                        <div className="h-5 w-10 rounded-full bg-white/10" />
                      </div>
                      {[1, 2].map(i => (
                        <div key={i} className="flex gap-2 rounded-lg p-2" style={{ background: template.colors.card }}>
                          <div className="w-10 h-10 rounded-md shrink-0" style={{ background: `${template.colors.accent}15` }} />
                          <div className="flex-1">
                            <div className="h-2 w-16 rounded-full bg-white/30" />
                            <div className="h-1.5 w-24 rounded-full bg-white/15 mt-1.5" />
                            <div className="h-2 w-8 rounded-full mt-2" style={{ background: `${template.colors.accent}80` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {isLocked && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-black/60 rounded-full p-3">
                          <Lock className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute top-3 right-3 bg-primary/90 rounded-full p-2">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Template Info */}
                  <div className="p-3 bg-card border-t border-border/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-foreground">{language === 'ar' ? template.nameAr : template.nameEn}</h3>
                        <p className="text-xs text-muted-foreground" dir="ltr">{language === 'ar' ? template.nameEn : template.nameAr}</p>
                      </div>
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white/20"
                        style={{ background: template.colors.accent }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{template.description}</p>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Live Preview Section */}
        {selectedTemplate && selectedTemplate !== ((restaurant as any).menuTemplate || "classic") && (
          <div className="mt-8 cinematic-card rounded-2xl p-6 border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{t('template.livePreview')}</h3>
                <p className="text-sm text-muted-foreground">{t('template.livePreviewDesc')}</p>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-background/50 border border-border/30 overflow-auto max-h-96">
              {(() => {
                const template = TEMPLATES.find(t => t.id === selectedTemplate);
                if (!template) return null;
                const bg1 = template.colors.bg.split(" ")[0]?.replace("from-[", "").replace("]", "");
                const bg2 = template.colors.bg.split(" ")[1]?.replace("to-[", "").replace("]", "");
                return (
                  <div 
                    className="text-xs text-right rounded-lg p-4 space-y-3" 
                    style={{ 
                      background: `linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%)`, 
                      color: "#ffffff" 
                    }}
                  >
                    <div className="font-bold text-sm">{language === 'ar' ? template.nameAr : template.nameEn}</div>
                    <div className="opacity-70 text-xs">{template.description}</div>
                    <div className="flex gap-2 pt-2">
                      <div className="w-8 h-8 rounded border border-white/20" style={{ background: bg1 }} title={t('template.bgColor1')} />
                      <div className="w-8 h-8 rounded border border-white/20" style={{ background: bg2 }} title={t('template.bgColor2')} />
                      <div className="w-8 h-8 rounded border border-white/20" style={{ background: template.colors.accent }} title={t('template.accentColor')} />
                      <div className="w-8 h-8 rounded border border-white/20" style={{ background: template.colors.card }} title={t('template.cardColor')} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Font Customizer Section */}
        <FontCustomizer
          restaurantId={restaurantId}
          currentCustomFonts={
            (restaurant as any).customFonts
              ? (() => { try { return JSON.parse((restaurant as any).customFonts); } catch { return null; } })()
              : null
          }
          isSubscribed={isSubscribed}
          isAdmin={user?.role === "admin"}
          onFontsUpdated={() => { refetchRestaurant(); }}
          currencySymbol={(restaurant as any)?.currencySymbol}
        />

        {/* Color Customizer Section */}
        <ColorCustomizer
          restaurantId={restaurantId}
          currentTemplate={selectedTemplate || ((restaurant as any).menuTemplate || "classic")}
          currentCustomColors={
            (restaurant as any).customColors
              ? (() => { try { return JSON.parse((restaurant as any).customColors); } catch { return null; } })()
              : null
          }
          isSubscribed={isSubscribed}
          restaurantName={(restaurant as any).nameAr || ""}
          isAdmin={user?.role === "admin"}
          onColorsUpdated={() => { refetchRestaurant(); }}
          currencySymbol={(restaurant as any)?.currencySymbol}
        />
      </div>
    </div>
  );
}
