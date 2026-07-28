import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Check, RotateCcw, Type, ChevronDown, ChevronUp,
  Crown, Lock, UtensilsCrossed
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Font Lists ──────────────────────────────────────────────

export const ARABIC_FONTS = [
  { id: "Cairo", name: "Cairo", nameAr: "كايرو", url: "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" },
  { id: "Tajawal", name: "Tajawal", nameAr: "تجوال", url: "https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap" },
  { id: "Almarai", name: "Almarai", nameAr: "المراعي", url: "https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap" },
  { id: "Changa", name: "Changa", nameAr: "شانجا", url: "https://fonts.googleapis.com/css2?family=Changa:wght@300;400;500;600;700;800&display=swap" },
  { id: "El Messiri", name: "El Messiri", nameAr: "المسيري", url: "https://fonts.googleapis.com/css2?family=El+Messiri:wght@400;500;600;700&display=swap" },
  { id: "Amiri", name: "Amiri", nameAr: "أميري", url: "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" },
  { id: "Noto Kufi Arabic", name: "Noto Kufi Arabic", nameAr: "نوتو كوفي", url: "https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap" },
  { id: "Noto Naskh Arabic", name: "Noto Naskh Arabic", nameAr: "نوتو نسخ", url: "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap" },
  { id: "IBM Plex Sans Arabic", name: "IBM Plex Sans Arabic", nameAr: "آي بي إم بلكس", url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" },
  { id: "Readex Pro", name: "Readex Pro", nameAr: "ريدكس برو", url: "https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=swap" },
  { id: "Reem Kufi", name: "Reem Kufi", nameAr: "ريم كوفي", url: "https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;500;600;700&display=swap" },
  { id: "Lalezar", name: "Lalezar", nameAr: "لاليزار", url: "https://fonts.googleapis.com/css2?family=Lalezar&display=swap" },
];

export const ENGLISH_FONTS = [
  { id: "Inter", name: "Inter", url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" },
  { id: "Poppins", name: "Poppins", url: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" },
  { id: "Montserrat", name: "Montserrat", url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" },
  { id: "Playfair Display", name: "Playfair Display", url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap" },
  { id: "Roboto", name: "Roboto", url: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" },
  { id: "Lato", name: "Lato", url: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" },
  { id: "Raleway", name: "Raleway", url: "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700;800;900&display=swap" },
  { id: "Oswald", name: "Oswald", url: "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap" },
  { id: "Nunito", name: "Nunito", url: "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap" },
  { id: "DM Sans", name: "DM Sans", url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" },
  { id: "Space Grotesk", name: "Space Grotesk", url: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" },
  { id: "Bebas Neue", name: "Bebas Neue", url: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" },
];

// ─── Types ──────────────────────────────────────────────────

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

export interface CustomFonts {
  arabicFont?: string;
  englishFont?: string;
  headingColor?: string;
  bodyColor?: string;
  priceColor?: string;
  headingSize?: FontSize;
  bodySize?: FontSize;
  priceSize?: FontSize;
}

interface FontCustomizerProps {
  restaurantId: number;
  currentCustomFonts: CustomFonts | null;
  /** PG-1C.3C: visibility from useCommercialFeatureVisibility().showCustomFonts */
  customFontsEnabled: boolean;
  onFontsUpdated?: () => void;
  currencySymbol?: string;
}

// ─── Font Loader ──────────────────────────────────────────────

function loadFont(fontId: string) {
  const arFont = ARABIC_FONTS.find(f => f.id === fontId);
  const enFont = ENGLISH_FONTS.find(f => f.id === fontId);
  const font = arFont || enFont;
  if (!font) return;

  const existingLink = document.querySelector(`link[data-font="${fontId}"]`);
  if (existingLink) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = font.url;
  link.setAttribute("data-font", fontId);
  document.head.appendChild(link);
}

// ─── Font Size Selector ───────────────────────────────────────────────

const FONT_SIZES: { id: FontSize; label: string; labelAr: string }[] = [
  { id: 'sm', label: 'S', labelAr: 'صغير' },
  { id: 'md', label: 'M', labelAr: 'متوسط' },
  { id: 'lg', label: 'L', labelAr: 'كبير' },
  { id: 'xl', label: 'XL', labelAr: 'كبير جداً' },
];

function FontSizeSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FontSize;
  onChange: (size: FontSize) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="flex gap-1">
        {FONT_SIZES.map((size) => (
          <button
            key={size.id}
            onClick={() => onChange(size.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              value === size.id
                ? "bg-primary text-primary-foreground ring-1 ring-primary/30"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Color Input ──────────────────────────────────────────────────────

function FontColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={inputValue}
        onChange={handleChange}
        className="w-10 h-10 rounded-lg cursor-pointer border border-border/30 shrink-0"
      />
      <div className="flex-1">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder="#000000"
          className="w-full px-2 py-1 rounded border border-border/30 bg-background text-foreground text-xs font-mono mt-1"
        />
      </div>
    </div>
  );
}

// ─── Font Preview ──────────────────────────────────────────────

function FontPreview({ fonts, currencySymbol }: { fonts: CustomFonts; currencySymbol?: string }) {
  const { t } = useLanguage();
  useEffect(() => {
    if (fonts.arabicFont) loadFont(fonts.arabicFont);
    if (fonts.englishFont) loadFont(fonts.englishFont);
  }, [fonts.arabicFont, fonts.englishFont]);

  const arStyle = fonts.arabicFont ? { fontFamily: `"${fonts.arabicFont}", sans-serif` } : {};
  const enStyle = fonts.englishFont ? { fontFamily: `"${fonts.englishFont}", sans-serif` } : {};
  const sizeMap = { sm: 0.85, md: 1, lg: 1.15, xl: 1.35 };
  const hScale = sizeMap[fonts.headingSize || 'md'];
  const bScale = sizeMap[fonts.bodySize || 'md'];
  const pScale = sizeMap[fonts.priceSize || 'md'];

  return (
    <div className="rounded-xl overflow-hidden bg-[#0a1628] text-white text-right text-xs p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
          <UtensilsCrossed className="w-4 h-4 text-teal-400" />
        </div>
        <div>
          <p className="text-xs font-bold" style={{ ...arStyle, color: fonts.headingColor || "#ffffff" }}>{t('colorCustomizer.sampleRestaurant') || 'مطعم تجريبي'}</p>
          <p className="text-[10px] opacity-60" style={enStyle}>Sample Restaurant</p>
        </div>
      </div>

      {/* Category */}
      <div className="flex gap-2">
        <div className="px-3 py-1 rounded-full text-[10px] font-bold bg-teal-500 text-black" style={arStyle}>{t('colorCustomizer.appetizers') || 'مقبلات'}</div>
        <div className="px-3 py-1 rounded-full text-[10px] bg-white/10 text-white/60" style={enStyle}>Appetizers</div>
      </div>

      {/* Items */}
      {[
        { nameAr: t('colorCustomizer.sampleItem1') || 'حمص تقليدي', nameEn: 'Classic Hummus', price: '15' },
        { nameAr: t('colorCustomizer.sampleItem2') || 'سلطة فتوش', nameEn: 'Fattoush Salad', price: '20' },
      ].map((item, i) => (
        <div key={i} className="flex gap-3 rounded-xl p-2.5 bg-white/5 border border-white/5">
          <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center bg-teal-500/10">
            <UtensilsCrossed className="w-4 h-4 opacity-30 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold" style={{ ...arStyle, color: fonts.headingColor || "#ffffff", fontSize: `${0.75 * hScale}rem` }}>{item.nameAr}</p>
            <p className="text-[10px] opacity-50 mt-0.5" style={{ ...enStyle, color: fonts.bodyColor || "#ffffff", fontSize: `${0.625 * bScale}rem` }}>{item.nameEn}</p>
            <p className="text-sm font-bold mt-1" style={{ ...enStyle, color: fonts.priceColor || "#14b8a6", fontSize: `${0.875 * pScale}rem` }}>
              {item.price} <span className="text-[10px] opacity-60">{currencySymbol || t('common.defaultCurrency') || 'ر.س'}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main FontCustomizer Component ─────────────────────────

export default function FontCustomizer({
  restaurantId,
  currentCustomFonts,
  customFontsEnabled,
  onFontsUpdated,
  currencySymbol,
}: FontCustomizerProps) {
  const { t } = useLanguage();
  const defaultFonts: CustomFonts = {
    arabicFont: "Cairo",
    englishFont: "Inter",
    headingColor: "#ffffff",
    bodyColor: "#ffffff",
    priceColor: "#14b8a6",
    headingSize: "md",
    bodySize: "md",
    priceSize: "md",
  };

  const [fonts, setFonts] = useState<CustomFonts>(currentCustomFonts || defaultFonts);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const utils = trpc.useUtils();

  // Sync state with prop when it changes (e.g. after parent refetch)
  useEffect(() => {
    if (currentCustomFonts) {
      setFonts(currentCustomFonts);
    }
  }, [currentCustomFonts]);

  // Load fonts on mount
  useEffect(() => {
    ARABIC_FONTS.forEach(f => loadFont(f.id));
    ENGLISH_FONTS.forEach(f => loadFont(f.id));
  }, []);

  const updateFontsMutation = trpc.restaurant.updateCustomFonts.useMutation({
    onSuccess: () => {
      toast.success(t("fonts.saved"));
      setHasChanges(false);
      utils.restaurant.getById.invalidate({ id: restaurantId });
      utils.restaurant.getBySlug.invalidate();
      onFontsUpdated?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFontChange = useCallback((key: keyof CustomFonts, value: string) => {
    setFonts(prev => {
      const next = { ...prev, [key]: value };
      setHasChanges(true);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setFonts(defaultFonts);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    updateFontsMutation.mutate({
      id: restaurantId,
      customFonts: fonts,
    });
  }, [restaurantId, fonts, updateFontsMutation]);

  if (!customFontsEnabled) {
    return (
      <div className="mt-6 landing-card rounded-2xl p-6 border border-accent/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{t("fonts.lockedTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("fonts.lockedSubtitle")}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("fonts.lockedDescription")}
        </p>
        <Link href="/pricing">
          <Button variant="outline" size="sm" className="border-accent/30 text-accent hover:bg-accent/10">
            <Crown className="w-4 h-4 ml-2" />
            {t("fonts.viewPlans")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full landing-card rounded-2xl p-5 flex items-center justify-between hover:border-primary/30 transition-all border border-border/30"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Type className="w-5 h-5 text-primary" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-foreground">{t("fonts.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("fonts.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary" style={{ fontFamily: fonts.arabicFont ? `"${fonts.arabicFont}"` : undefined }}>{t('fonts.arabicLabel') || 'عربي'}</span>
            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary" style={{ fontFamily: fonts.englishFont ? `"${fonts.englishFont}"` : undefined }}>En</span>
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
              {/* Font & Color Controls */}
              <div className="space-y-5">
                {/* Arabic Font */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-foreground">{t("fonts.arabicFont")}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5 ml-1" />
                      {t("fonts.reset")}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ARABIC_FONTS.map((font) => (
                      <button
                        key={font.id}
                        onClick={() => handleFontChange("arabicFont", font.id)}
                        className={`p-3 rounded-xl border text-right transition-all ${
                          fonts.arabicFont === font.id
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                            : "border-border/30 hover:border-primary/30 hover:bg-primary/5"
                        }`}
                        style={{ fontFamily: `"${font.id}", sans-serif` }}
                      >
                        <p className="text-sm font-bold text-foreground">{font.nameAr}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{font.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* English Font */}
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-2">{t("fonts.englishFont")}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ENGLISH_FONTS.map((font) => (
                      <button
                        key={font.id}
                        onClick={() => handleFontChange("englishFont", font.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          fonts.englishFont === font.id
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                            : "border-border/30 hover:border-primary/30 hover:bg-primary/5"
                        }`}
                        style={{ fontFamily: `"${font.id}", sans-serif` }}
                      >
                        <p className="text-sm font-bold text-foreground">{font.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Aa Bb Cc 123</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Colors */}
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-3">{t("fonts.textColors")}</h4>
                  <div className="space-y-3">
                    <FontColorInput
                      label={t("fonts.headingColor")}
                      value={fonts.headingColor || "#ffffff"}
                      onChange={(v) => handleFontChange("headingColor", v)}
                    />
                    <FontColorInput
                      label={t("fonts.bodyColor")}
                      value={fonts.bodyColor || "#ffffff"}
                      onChange={(v) => handleFontChange("bodyColor", v)}
                    />
                    <FontColorInput
                      label={t("fonts.priceColor")}
                      value={fonts.priceColor || "#14b8a6"}
                      onChange={(v) => handleFontChange("priceColor", v)}
                    />
                  </div>
                </div>

                {/* Font Sizes */}
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-3">{t("fonts.fontSizes")}</h4>
                  <div className="space-y-3">
                    <FontSizeSelector
                      label={t("fonts.headingSize")}
                      value={fonts.headingSize || "md"}
                      onChange={(v) => handleFontChange("headingSize", v)}
                    />
                    <FontSizeSelector
                      label={t("fonts.bodySize")}
                      value={fonts.bodySize || "md"}
                      onChange={(v) => handleFontChange("bodySize", v)}
                    />
                    <FontSizeSelector
                      label={t("fonts.priceSize")}
                      value={fonts.priceSize || "md"}
                      onChange={(v) => handleFontChange("priceSize", v)}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || updateFontsMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {updateFontsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 ml-2" />
                  )}
                  {t("fonts.save")}
                </Button>
              </div>

              {/* Preview */}
              <div>
                <h4 className="text-sm font-bold text-foreground mb-3">{t("fonts.preview")}</h4>
                <FontPreview fonts={fonts} currencySymbol={currencySymbol} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
