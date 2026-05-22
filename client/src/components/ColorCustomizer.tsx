import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Check, RotateCcw, Palette, ChevronDown, ChevronUp,
  Store, UtensilsCrossed, Crown, Lock, Eye
} from "lucide-react";
import { TEMPLATES, type TemplateId, BACKGROUND_PATTERNS, getPatternSize, getPatternPosition } from "@/components/MenuTemplates";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Types ──────────────────────────────────────────────────

export interface CustomColors {
  bg1: string;
  bg2: string;
  accent: string;
  card: string;
  textColor: string;
  backgroundPattern?: string;
}

interface ColorCustomizerProps {
  restaurantId: number;
  currentTemplate: string;
  currentCustomColors: CustomColors | null;
  isSubscribed: boolean;
  restaurantName: string;
  isAdmin?: boolean;
  onColorsUpdated?: () => void;
  currencySymbol?: string;
}

// ─── Helper: Extract default colors from template ───────────

function getDefaultColors(templateId: string): CustomColors {
  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    return { bg1: "#0a1628", bg2: "#0d2137", accent: "#14b8a6", card: "#142840", textColor: "#ffffff" };
  }

  // Parse bg colors from tailwind format "from-[#xxx] to-[#yyy]"
  const bgParts = template.colors.bg.split(" ");
  const bg1 = bgParts[0]?.replace("from-[", "").replace("]", "") || "#0a1628";
  const bg2 = bgParts[1]?.replace("to-[", "").replace("]", "") || "#0d2137";

  // Parse card color from rgba to hex (approximate)
  const cardMatch = template.colors.card.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  let card = "#142840";
  if (cardMatch) {
    const r = parseInt(cardMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(cardMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(cardMatch[3]).toString(16).padStart(2, "0");
    card = `#${r}${g}${b}`;
  }

  return {
    bg1,
    bg2,
    accent: template.colors.accent,
    card,
    textColor: "#ffffff",
  };
}

// ─── Color Input Component ──────────────────────────────────

function ColorInput({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium text-foreground">{label}</label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex gap-2 items-center">
        <input
          ref={inputRef}
          type="color"
          value={inputValue}
          onChange={handleChange}
          disabled={disabled}
          className="w-12 h-10 rounded-lg cursor-pointer border border-border/30"
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          disabled={disabled}
          placeholder="#000000"
          className="flex-1 px-3 py-2 rounded-lg border border-border/30 bg-background text-foreground text-sm font-mono disabled:opacity-50"
        />
      </div>
    </div>
  );
}

// ─── Menu Preview Component ──────────────────────────────────

function MenuPreview({ colors, currencySymbol }: { colors: CustomColors; currencySymbol?: string }) {
  const { t } = useLanguage();
  return (
    <div
      className="rounded-xl overflow-hidden text-right text-xs"
      style={{
        background: `linear-gradient(135deg, ${colors.bg1} 0%, ${colors.bg2} 100%)`,
        color: colors.textColor,
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg" style={{ background: `${colors.accent}30` }} />
          <div>
            <p className="text-xs font-bold">{t('colorCustomizer.sampleRestaurant') || 'مطعم تجريبي'}</p>
            <p className="text-[10px] opacity-60">{t('colorCustomizer.digitalMenu') || 'منيو رقمي'}</p>
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div className="px-4 pb-3 flex gap-2">
        <div className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: colors.accent, color: "#000" }}>{t('colorCustomizer.appetizers') || 'مقبلات'}</div>
        <div className="px-3 py-1 rounded-full text-[10px]" style={{ background: "rgba(255,255,255,0.08)", color: `${colors.textColor}80` }}>{t('colorCustomizer.mainDishes') || 'أطباق رئيسية'}</div>
        <div className="px-3 py-1 rounded-full text-[10px]" style={{ background: "rgba(255,255,255,0.08)", color: `${colors.textColor}80` }}>{t('colorCustomizer.drinks') || 'مشروبات'}</div>
      </div>

      {/* Menu items */}
      <div className="px-4 pb-4 space-y-2">
        {[
          { name: t('colorCustomizer.sampleItem1') || 'حمص تقليدي', price: '15' },
          { name: t('colorCustomizer.sampleItem2') || 'سلطة فتوش', price: '20' },
        ].map((item, i) => (
          <div key={i} className="flex gap-3 rounded-xl p-2.5" style={{ background: `${colors.card}99`, border: `1px solid ${colors.accent}15` }}>
            <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center" style={{ background: `${colors.accent}10` }}>
              <UtensilsCrossed className="w-5 h-5 opacity-30" style={{ color: colors.textColor }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold" style={{ color: colors.textColor }}>{item.name}</p>
              <p className="text-[10px] opacity-50 mt-0.5" style={{ color: colors.textColor }}>وصف الصنف هنا</p>
              <p className="text-sm font-bold mt-1" style={{ color: colors.accent }}>{item.price} <span className="text-[10px] opacity-60" style={{ color: colors.textColor }}>{currencySymbol || 'ر.س'}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="py-2 border-t border-white/10 text-center">
        <p className="text-[10px] opacity-40" style={{ color: colors.textColor }}>
          مدعوم بواسطة <span style={{ color: colors.accent }}>mineuqr</span>
        </p>
      </div>
    </div>
  );
}

// ─── Main ColorCustomizer Component ─────────────────────────

export default function ColorCustomizer({
  restaurantId,
  currentTemplate,
  currentCustomColors,
  isSubscribed,
  restaurantName,
  isAdmin = false,
  onColorsUpdated,
  currencySymbol,
}: ColorCustomizerProps) {
  const { t } = useLanguage();
  const defaultColors = getDefaultColors(currentTemplate);
  const [colors, setColors] = useState<CustomColors>(currentCustomColors || defaultColors);
  // Start expanded by default so users can see the save button immediately
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const utils = trpc.useUtils();

  const updateColorsMutation = trpc.restaurant.updateCustomColors.useMutation({
    onSuccess: () => {
      toast.success(t("colors.saved"));
      setHasChanges(false);
      utils.restaurant.getById.invalidate({ id: restaurantId });
      utils.restaurant.getBySlug.invalidate();
      onColorsUpdated?.();
    },
    onError: (error) => {
      if (error.message.includes("المدفوعة")) {
        toast.error(t("colors.premiumOnly"));
      } else {
        toast.error(error.message);
      }
    },
  });

  const handleColorChange = useCallback((key: keyof CustomColors, value: string) => {
    setColors(prev => {
      const next = { ...prev, [key]: value };
      setHasChanges(true);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    const defaults = getDefaultColors(currentTemplate);
    setColors(defaults);
    setHasChanges(true);
  }, [currentTemplate]);

  const handleResetToNull = useCallback(() => {
    updateColorsMutation.mutate({
      id: restaurantId,
      customColors: null,
    });
    setColors(defaultColors);
    setHasChanges(false);
  }, [restaurantId, defaultColors]);

  const handleSave = useCallback(() => {
    updateColorsMutation.mutate({
      id: restaurantId,
      customColors: colors,
    });
  }, [restaurantId, colors, updateColorsMutation]);

  // Sync state with prop when it changes (e.g. after parent refetch)
  useEffect(() => {
    if (currentCustomColors) {
      setColors(currentCustomColors);
    }
  }, [currentCustomColors]);

  // Update colors when template changes - always reset to template defaults when template changes
  useEffect(() => {
    // When template changes, reset to the new template's default colors
    setColors(getDefaultColors(currentTemplate));
    setHasChanges(false);
  }, [currentTemplate]);

  const colorFields: { key: keyof CustomColors; label: string; description: string }[] = [
    { key: "bg1", label: t("colors.bg1"), description: t("colors.bg1Desc") },
    { key: "bg2", label: t("colors.bg2"), description: t("colors.bg2Desc") },
    { key: "accent", label: t("colors.accent"), description: t("colors.accentDesc") },
    { key: "card", label: t("colors.card"), description: t("colors.cardDesc") },
    { key: "textColor", label: t("colors.textColor"), description: t("colors.textColorDesc") },
  ];

  // Allow admin/owner to access color customization without subscription
  const canCustomizeColors = isSubscribed || isAdmin;

  if (!canCustomizeColors) {
    return (
      <div className="mt-8 cinematic-card rounded-2xl p-6 border border-accent/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{t("colors.lockedTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("colors.lockedSubtitle")}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("colors.lockedDescription")}
        </p>
        <Link href="/pricing">
          <Button variant="outline" size="sm" className="border-accent/30 text-accent hover:bg-accent/10">
            <Crown className="w-4 h-4 ml-2" />
            {t("colors.viewPlans")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full cinematic-card rounded-2xl p-5 flex items-center justify-between hover:border-primary/30 transition-all border border-border/30"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-foreground">{t("colors.title")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentCustomColors ? t("colors.subtitle") : t("colors.subtitleDefault")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Color dots preview */}
          <div className="flex gap-1">
            {[colors.bg1, colors.accent, colors.card].map((c, i) => (
              <div key={i} className="w-5 h-5 rounded-full border border-white/20" style={{ background: c }} />
            ))}
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Color Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-foreground">{t("colors.colorsLabel")}</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5 ml-1" />
                      {t("colors.resetTemplate")}
                    </Button>
                    {currentCustomColors && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetToNull}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="w-3.5 h-3.5 ml-1" />
                        {t("colors.removeCustom")}
                      </Button>
                    )}
                  </div>
                </div>

                {colorFields.map((field) => (
                  <ColorInput
                    key={field.key}
                    label={field.label}
                    description={field.description}
                    value={colors[field.key] || "#000000"}
                    onChange={(value) => handleColorChange(field.key, value)}
                  />
                ))}

                {/* Background Pattern Selector */}
                <div className="mt-4 space-y-2">
                  <div>
                    <label className="text-sm font-medium text-foreground">{t("colors.backgroundPattern")}</label>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("colors.backgroundPatternDesc")}</p>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {BACKGROUND_PATTERNS.map((pattern) => {
                      const isSelected = (colors.backgroundPattern || "none") === pattern.id;
                      const patternCss = pattern.id !== "none" ? pattern.css(colors.accent) : "none";
                      const patternSize = pattern.id !== "none" ? getPatternSize(pattern.id) : "auto";
                      const patternPos = pattern.id !== "none" ? getPatternPosition(pattern.id) : "0 0";
                      return (
                        <button
                          key={pattern.id}
                          onClick={() => handleColorChange("backgroundPattern" as keyof CustomColors, pattern.id)}
                          className={`relative w-full aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                            isSelected ? "border-primary ring-2 ring-primary/30" : "border-border/30 hover:border-primary/50"
                          }`}
                          title={pattern.nameAr}
                        >
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(135deg, ${colors.bg1} 0%, ${colors.bg2} 100%)`,
                            }}
                          />
                          {pattern.id !== "none" && (
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundImage: patternCss,
                                backgroundSize: patternSize,
                                backgroundPosition: patternPos,
                                opacity: 0.8,
                              }}
                            />
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                              <Check className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <span className="absolute bottom-0.5 left-0 right-0 text-[8px] text-center text-foreground/70 truncate px-0.5">{pattern.nameAr}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || updateColorsMutation.isPending}
                  className="w-full mt-4 bg-primary hover:bg-primary/90"
                >
                  {updateColorsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 ml-2" />
                  )}
                  {t("colors.save")}
                </Button>
              </div>

              {/* Preview */}
              <div>
                <h4 className="text-sm font-bold text-foreground mb-3">{t("colors.preview")}</h4>
                <MenuPreview colors={colors} currencySymbol={currencySymbol} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
