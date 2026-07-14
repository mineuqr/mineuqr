import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, Phone, MapPin, ChevronUp, ChevronDown,
  AlertCircle, Sparkles, Crown, Star, MessageCircle, AlertTriangle, Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolveImageUrl } from "@/lib/utils";
import { getOpenStatusFromRestaurant, todayYmd } from "@/lib/restaurantHours";
import { MenuBrowseArea } from "@/components/menu/MenuBrowseArea";
import type { MenuBrowseTab } from "@/components/menu/types";

// Template configuration
export const TEMPLATES = [
  { id: "classic", nameAr: "كلاسيكي", nameEn: "Classic", isPremium: false, description: "تصميم بسيط وأنيق بألوان داكنة", colors: { bg: "from-[#0a1628] to-[#0d2137]", accent: "#14b8a6", card: "rgba(20,40,60,0.6)" } },
  { id: "elegant", nameAr: "أنيق", nameEn: "Elegant", isPremium: true, description: "تصميم فاخر بألوان ذهبية وسوداء", colors: { bg: "from-[#1a1a2e] to-[#16213e]", accent: "#d4a853", card: "rgba(30,30,50,0.7)" } },
  { id: "modern", nameAr: "عصري", nameEn: "Modern", isPremium: true, description: "تصميم حديث بألوان زاهية ومتدرجة", colors: { bg: "from-[#667eea] to-[#764ba2]", accent: "#f093fb", card: "rgba(255,255,255,0.15)" } },
  { id: "dark", nameAr: "داكن", nameEn: "Dark", isPremium: true, description: "تصميم داكن أنيق مع لمسات حمراء", colors: { bg: "from-[#0f0f0f] to-[#1a1a1a]", accent: "#ef4444", card: "rgba(40,40,40,0.8)" } },
  { id: "warm", nameAr: "دافئ", nameEn: "Warm", isPremium: true, description: "تصميم دافئ بألوان البرتقالي والبني", colors: { bg: "from-[#2d1810] to-[#3d2418]", accent: "#f97316", card: "rgba(60,30,15,0.7)" } },
  { id: "ocean", nameAr: "محيط", nameEn: "Ocean", isPremium: true, description: "تصميم بحري بألوان الأزرق والأخضر", colors: { bg: "from-[#0c2340] to-[#0a3d62]", accent: "#00d2ff", card: "rgba(10,50,80,0.6)" } },
  { id: "royal", nameAr: "ملكي", nameEn: "Royal", isPremium: true, description: "تصميم ملكي بألوان البنفسجي والذهبي", colors: { bg: "from-[#2d1b69] to-[#1a0a3e]", accent: "#fbbf24", card: "rgba(50,30,100,0.6)" } },
  { id: "neon", nameAr: "نيون", nameEn: "Neon", isPremium: true, description: "تصميم جريء بألوان النيون المتوهجة", colors: { bg: "from-[#0a0a0a] to-[#111111]", accent: "#39ff14", card: "rgba(20,20,20,0.9)" } },
] as const;

export type TemplateId = typeof TEMPLATES[number]["id"];

export interface CustomColors {
  bg1?: string;
  bg2?: string;
  accent?: string;
  card?: string;
  textColor?: string;
  backgroundPattern?: string;
}

// Background patterns CSS definitions
export const BACKGROUND_PATTERNS: { id: string; nameAr: string; nameEn: string; css: (color: string) => string }[] = [
  { id: "none", nameAr: "بدون نمط", nameEn: "None", css: () => "none" },
  { id: "dots", nameAr: "نقاط", nameEn: "Dots", css: (c) => `radial-gradient(circle, ${c}15 1px, transparent 1px)` },
  { id: "grid", nameAr: "شبكة", nameEn: "Grid", css: (c) => `linear-gradient(${c}08 1px, transparent 1px), linear-gradient(90deg, ${c}08 1px, transparent 1px)` },
  { id: "diagonal", nameAr: "خطوط مائلة", nameEn: "Diagonal Lines", css: (c) => `repeating-linear-gradient(45deg, transparent, transparent 10px, ${c}08 10px, ${c}08 11px)` },
  { id: "horizontal", nameAr: "خطوط أفقية", nameEn: "Horizontal Lines", css: (c) => `repeating-linear-gradient(0deg, transparent, transparent 20px, ${c}08 20px, ${c}08 21px)` },
  { id: "zigzag", nameAr: "متعرج", nameEn: "Zigzag", css: (c) => `linear-gradient(135deg, ${c}0a 25%, transparent 25%), linear-gradient(225deg, ${c}0a 25%, transparent 25%), linear-gradient(315deg, ${c}0a 25%, transparent 25%), linear-gradient(45deg, ${c}0a 25%, transparent 25%)` },
  { id: "circles", nameAr: "دوائر", nameEn: "Circles", css: (c) => `radial-gradient(circle at 25px 25px, ${c}10 2%, transparent 0%), radial-gradient(circle at 75px 75px, ${c}10 2%, transparent 0%)` },
  { id: "diamond", nameAr: "ماسي", nameEn: "Diamond", css: (c) => `linear-gradient(45deg, ${c}08 25%, transparent 25%, transparent 75%, ${c}08 75%), linear-gradient(45deg, ${c}08 25%, transparent 25%, transparent 75%, ${c}08 75%)` },
  { id: "waves", nameAr: "موجات", nameEn: "Waves", css: (c) => `radial-gradient(ellipse at 50% 0%, ${c}0d 0%, transparent 70%), radial-gradient(ellipse at 50% 100%, ${c}0d 0%, transparent 70%)` },
  { id: "stars", nameAr: "نجوم", nameEn: "Stars", css: (c) => `radial-gradient(circle, ${c}12 1px, transparent 1px), radial-gradient(circle, ${c}08 1px, transparent 1px)` },
];

// Get pattern background size
export function getPatternSize(patternId: string): string {
  switch (patternId) {
    case "dots": return "20px 20px";
    case "grid": return "30px 30px";
    case "diagonal": return "auto";
    case "horizontal": return "auto";
    case "zigzag": return "50px 50px";
    case "circles": return "100px 100px";
    case "diamond": return "30px 30px";
    case "waves": return "100% 200px";
    case "stars": return "50px 50px, 30px 30px";
    default: return "auto";
  }
}

// Get pattern background position
export function getPatternPosition(patternId: string): string {
  switch (patternId) {
    case "diamond": return "0 0, 15px 15px";
    case "stars": return "0 0, 25px 25px";
    default: return "0 0";
  }
}

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

interface TemplateProps {
  restaurant: any;
  categories: any[];
  items: any[];
  activeCategoryId: number | null;
  setActiveCategoryId: (id: number | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredItems: any[];
  showScrollTop: boolean;
  customColors?: CustomColors | null;
  customFonts?: CustomFonts | null;
  offers?: any[];
  tableNumber?: number;
  menuTab: MenuBrowseTab;
  setMenuTab: (tab: MenuBrowseTab) => void;
}

export type { MenuBrowseTab };

/** Merge custom colors with template defaults */
function useColors(templateDefaults: { bg1: string; bg2: string; accent: string; card: string; textColor: string }, custom?: CustomColors | null) {
  return {
    bg1: custom?.bg1 || templateDefaults.bg1,
    bg2: custom?.bg2 || templateDefaults.bg2,
    accent: custom?.accent || templateDefaults.accent,
    card: custom?.card || templateDefaults.card,
    textColor: custom?.textColor || templateDefaults.textColor,
    backgroundPattern: custom?.backgroundPattern || "none",
  };
}

/** Build font styles from custom fonts */
function useFontStyles(customFonts?: CustomFonts | null) {
  useEffect(() => {
    if (!customFonts) return;
    const fonts: string[] = [];
    if (customFonts.arabicFont) fonts.push(customFonts.arabicFont);
    if (customFonts.englishFont) fonts.push(customFonts.englishFont);
    fonts.forEach(fontId => {
      const existingLink = document.querySelector(`link[data-font="${fontId}"]`);
      if (existingLink) return;
      const families = fontId.replace(/ /g, '+');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${families}:wght@300;400;500;600;700;800;900&display=swap`;
      link.setAttribute('data-font', fontId);
      document.head.appendChild(link);
    });
  }, [customFonts?.arabicFont, customFonts?.englishFont]);

  const sizeMap = { sm: '0.85', md: '1', lg: '1.15', xl: '1.35' };
  const getScale = (size?: FontSize) => sizeMap[size || 'md'];

  return {
    arStyle: customFonts?.arabicFont ? { fontFamily: `"${customFonts.arabicFont}", sans-serif` } as React.CSSProperties : {},
    enStyle: customFonts?.englishFont ? { fontFamily: `"${customFonts.englishFont}", sans-serif` } as React.CSSProperties : {},
    headingColor: customFonts?.headingColor,
    bodyColor: customFonts?.bodyColor,
    priceColor: customFonts?.priceColor,
    headingScale: getScale(customFonts?.headingSize),
    bodyScale: getScale(customFonts?.bodySize),
    priceScale: getScale(customFonts?.priceSize),
  };
}

// ============================================
// 1. CLASSIC TEMPLATE (Default - Free)
// ============================================
export function ClassicTemplate(props: TemplateProps) {
  const { restaurant, categories, filteredItems, activeCategoryId, setActiveCategoryId, searchQuery, setSearchQuery, showScrollTop, customColors, customFonts, offers, tableNumber, menuTab, setMenuTab } = props;
  const c = useColors({ bg1: "#0a1628", bg2: "#0d2137", accent: "#14b8a6", card: "#142840", textColor: "#ffffff" }, customColors);
  const fs = useFontStyles(customFonts);
  const cs = restaurant?.currencySymbol || 'ر.س';

  return (
    <div className="min-h-screen relative" style={{ background: `linear-gradient(135deg, ${c.bg1} 0%, ${c.bg2} 100%)` }}>
      {c.backgroundPattern !== "none" && <PatternOverlay patternId={c.backgroundPattern} accentColor={c.accent} />}
      <TemplateHeader restaurant={restaurant} accentColor={c.accent} textColor={c.textColor} />
      <MenuBrowseArea
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        offers={offers || []}
        categories={categories}
        activeCategoryId={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredItems={filteredItems}
        accentColor={c.accent}
        textColor={c.textColor}
        searchBgStyle={`${c.bg1}d9`}
        cardBg={`${c.card}99`}
        cardStyle="border border-white/10"
        currencySymbol={cs}
        fontStyles={fs}
        tableNumber={tableNumber}
      />
      <TemplateFooter accentColor={c.accent} textColor={c.textColor} />
      <ScrollTopButton show={showScrollTop} accentColor={c.accent} />
    </div>
  );
}

// ============================================
// 2. ELEGANT TEMPLATE (Premium)
// ============================================
export function ElegantTemplate(props: TemplateProps) {
  const { restaurant, categories, filteredItems, activeCategoryId, setActiveCategoryId, searchQuery, setSearchQuery, showScrollTop, customColors, customFonts, offers, tableNumber, menuTab, setMenuTab } = props;
  const c = useColors({ bg1: "#1a1a2e", bg2: "#16213e", accent: "#d4a853", card: "#1e1e32", textColor: "#ffffff" }, customColors);
  const fs = useFontStyles(customFonts);
  const cs = restaurant?.currencySymbol || 'ر.س';

  return (
    <div className="min-h-screen relative" style={{ background: `linear-gradient(135deg, ${c.bg1} 0%, ${c.bg2} 100%)` }}>
      {c.backgroundPattern !== "none" && <PatternOverlay patternId={c.backgroundPattern} accentColor={c.accent} />}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: `linear-gradient(to right, transparent, ${c.accent}4d, transparent)` }} />
        <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: `linear-gradient(to right, transparent, ${c.accent}4d, transparent)` }} />
      </div>
      <TemplateHeader restaurant={restaurant} accentColor={c.accent} textColor={c.textColor} titleExtra={<Crown className="w-5 h-5 inline-block mr-2" style={{ color: c.accent }} />} />
      <MenuBrowseArea
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        offers={offers || []}
        categories={categories}
        activeCategoryId={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredItems={filteredItems}
        accentColor={c.accent}
        textColor={c.textColor}
        searchBgStyle={`${c.bg1}e6`}
        cardBg={`${c.card}b3`}
        cardStyle="border border-white/10"
        currencySymbol={cs}
        fontStyles={fs}
        tableNumber={tableNumber}
        pillStyle={`border border-[${c.accent}]/30`}
        pricePrefix=""
      />
      <TemplateFooter accentColor={c.accent} textColor={c.textColor} />
      <ScrollTopButton show={showScrollTop} accentColor={c.accent} />
    </div>
  );
}

// ============================================
// 3. MODERN TEMPLATE (Premium)
// ============================================
export function ModernTemplate(props: TemplateProps) {
  const { restaurant, categories, filteredItems, activeCategoryId, setActiveCategoryId, searchQuery, setSearchQuery, showScrollTop, customColors, customFonts, offers, tableNumber, menuTab, setMenuTab } = props;
  const c = useColors({ bg1: "#667eea", bg2: "#764ba2", accent: "#f093fb", card: "#ffffff", textColor: "#ffffff" }, customColors);
  const fs = useFontStyles(customFonts);
  const cs = restaurant?.currencySymbol || 'ر.س';

  return (
    <div className="min-h-screen relative" style={{ background: `linear-gradient(135deg, ${c.bg1} 0%, ${c.bg2} 100%)` }}>
      {c.backgroundPattern !== "none" && <PatternOverlay patternId={c.backgroundPattern} accentColor={c.accent} />}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full blur-3xl" style={{ background: `${c.accent}1a` }} />
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl" style={{ background: `${c.bg1}1a` }} />
      </div>
      <TemplateHeader restaurant={restaurant} accentColor={c.accent} textColor={c.textColor} />
      <MenuBrowseArea
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        offers={offers || []}
        categories={categories}
        activeCategoryId={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredItems={filteredItems}
        accentColor={c.accent}
        textColor={c.textColor}
        searchBgStyle={`${c.bg1}d9`}
        cardBg={`${c.card}26`}
        cardStyle="backdrop-blur-md border border-white/20"
        currencySymbol={cs}
        fontStyles={fs}
        tableNumber={tableNumber}
      />
      <TemplateFooter accentColor={c.accent} textColor={c.textColor} />
      <ScrollTopButton show={showScrollTop} accentColor={c.accent} />
    </div>
  );
}

// ============================================
// 4. DARK TEMPLATE (Premium)
// ============================================
export function DarkTemplate(props: TemplateProps) {
  const { restaurant, categories, filteredItems, activeCategoryId, setActiveCategoryId, searchQuery, setSearchQuery, showScrollTop, customColors, customFonts, offers, tableNumber, menuTab, setMenuTab } = props;
  const c = useColors({ bg1: "#0f0f0f", bg2: "#1a1a1a", accent: "#ef4444", card: "#282828", textColor: "#ffffff" }, customColors);
  const fs = useFontStyles(customFonts);
  const cs = restaurant?.currencySymbol || 'ر.س';

  return (
    <div className="min-h-screen relative" style={{ background: `linear-gradient(135deg, ${c.bg1} 0%, ${c.bg2} 100%)` }}>
      {c.backgroundPattern !== "none" && <PatternOverlay patternId={c.backgroundPattern} accentColor={c.accent} />}
      <TemplateHeader restaurant={restaurant} accentColor={c.accent} textColor={c.textColor} />
      <MenuBrowseArea
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        offers={offers || []}
        categories={categories}
        activeCategoryId={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredItems={filteredItems}
        accentColor={c.accent}
        textColor={c.textColor}
        searchBgStyle={`${c.bg1}f2`}
        cardBg={`${c.card}cc`}
        cardStyle="border border-white/5 transition-colors"
        currencySymbol={cs}
        fontStyles={fs}
        tableNumber={tableNumber}
      />
      <TemplateFooter accentColor={c.accent} textColor={c.textColor} />
      <ScrollTopButton show={showScrollTop} accentColor={c.accent} />
    </div>
  );
}

// ============================================
// 5. WARM TEMPLATE (Premium)
// ============================================
export function WarmTemplate(props: TemplateProps) {
  const { restaurant, categories, filteredItems, activeCategoryId, setActiveCategoryId, searchQuery, setSearchQuery, showScrollTop, customColors, customFonts, offers, tableNumber, menuTab, setMenuTab } = props;
  const c = useColors({ bg1: "#2d1810", bg2: "#3d2418", accent: "#f97316", card: "#3c1e0f", textColor: "#ffffff" }, customColors);
  const fs = useFontStyles(customFonts);
  const cs = restaurant?.currencySymbol || 'ر.س';

  return (
    <div className="min-h-screen relative" style={{ background: `linear-gradient(135deg, ${c.bg1} 0%, ${c.bg2} 100%)` }}>
      {c.backgroundPattern !== "none" && <PatternOverlay patternId={c.backgroundPattern} accentColor={c.accent} />}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-64" style={{ background: `linear-gradient(to bottom, ${c.accent}0d, transparent)` }} />
      </div>
      <TemplateHeader restaurant={restaurant} accentColor={c.accent} textColor={c.textColor} />
      <MenuBrowseArea
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        offers={offers || []}
        categories={categories}
        activeCategoryId={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredItems={filteredItems}
        accentColor={c.accent}
        textColor={c.textColor}
        searchBgStyle={`${c.bg1}e6`}
        cardBg={`${c.card}b3`}
        cardStyle="border border-white/10"
        currencySymbol={cs}
        fontStyles={fs}
        tableNumber={tableNumber}
      />
      <TemplateFooter accentColor={c.accent} textColor={c.textColor} />
      <ScrollTopButton show={showScrollTop} accentColor={c.accent} />
    </div>
  );
}

// ============================================
// 6. OCEAN TEMPLATE (Premium)
// ============================================
export function OceanTemplate(props: TemplateProps) {
  const { restaurant, categories, filteredItems, activeCategoryId, setActiveCategoryId, searchQuery, setSearchQuery, showScrollTop, customColors, customFonts, offers, tableNumber, menuTab, setMenuTab } = props;
  const c = useColors({ bg1: "#0c2340", bg2: "#0a3d62", accent: "#00d2ff", card: "#0a3250", textColor: "#ffffff" }, customColors);
  const fs = useFontStyles(customFonts);
  const cs = restaurant?.currencySymbol || 'ر.س';

  return (
    <div className="min-h-screen relative" style={{ background: `linear-gradient(135deg, ${c.bg1} 0%, ${c.bg2} 100%)` }}>
      {c.backgroundPattern !== "none" && <PatternOverlay patternId={c.backgroundPattern} accentColor={c.accent} />}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-40 left-10 w-80 h-80 rounded-full blur-3xl" style={{ background: `${c.accent}0d` }} />
        <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full blur-3xl" style={{ background: `${c.accent}0d` }} />
      </div>
      <TemplateHeader restaurant={restaurant} accentColor={c.accent} textColor={c.textColor} />
      <MenuBrowseArea
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        offers={offers || []}
        categories={categories}
        activeCategoryId={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredItems={filteredItems}
        accentColor={c.accent}
        textColor={c.textColor}
        searchBgStyle={`${c.bg1}e6`}
        cardBg={`${c.card}99`}
        cardStyle="border border-white/10 backdrop-blur-sm"
        currencySymbol={cs}
        fontStyles={fs}
        tableNumber={tableNumber}
      />
      <TemplateFooter accentColor={c.accent} textColor={c.textColor} />
      <ScrollTopButton show={showScrollTop} accentColor={c.accent} />
    </div>
  );
}

// ============================================
// 7. ROYAL TEMPLATE (Premium)
// ============================================
export function RoyalTemplate(props: TemplateProps) {
  const { restaurant, categories, filteredItems, activeCategoryId, setActiveCategoryId, searchQuery, setSearchQuery, showScrollTop, customColors, customFonts, offers, tableNumber, menuTab, setMenuTab } = props;
  const c = useColors({ bg1: "#2d1b69", bg2: "#1a0a3e", accent: "#fbbf24", card: "#321e64", textColor: "#ffffff" }, customColors);
  const fs = useFontStyles(customFonts);
  const cs = restaurant?.currencySymbol || 'ر.س';

  return (
    <div className="min-h-screen relative" style={{ background: `linear-gradient(135deg, ${c.bg1} 0%, ${c.bg2} 100%)` }}>
      {c.backgroundPattern !== "none" && <PatternOverlay patternId={c.backgroundPattern} accentColor={c.accent} />}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl" style={{ background: `${c.accent}0d` }} />
      </div>
      <TemplateHeader restaurant={restaurant} accentColor={c.accent} textColor={c.textColor} titleExtra={<Star className="w-4 h-4 inline-block mr-1" style={{ color: c.accent, fill: c.accent }} />} />
      <MenuBrowseArea
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        offers={offers || []}
        categories={categories}
        activeCategoryId={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredItems={filteredItems}
        accentColor={c.accent}
        textColor={c.textColor}
        searchBgStyle={`${c.bg1}e6`}
        cardBg={`${c.card}99`}
        cardStyle="border border-white/10"
        currencySymbol={cs}
        fontStyles={fs}
        tableNumber={tableNumber}
        pillStyle="border border-white/15"
      />
      <TemplateFooter accentColor={c.accent} textColor={c.textColor} />
      <ScrollTopButton show={showScrollTop} accentColor={c.accent} />
    </div>
  );
}

// ============================================
// 8. NEON TEMPLATE (Premium)
// ============================================
export function NeonTemplate(props: TemplateProps) {
  const { restaurant, categories, filteredItems, activeCategoryId, setActiveCategoryId, searchQuery, setSearchQuery, showScrollTop, customColors, customFonts, offers, tableNumber, menuTab, setMenuTab } = props;
  const c = useColors({ bg1: "#0a0a0a", bg2: "#111111", accent: "#39ff14", card: "#141414", textColor: "#ffffff" }, customColors);
  const fs = useFontStyles(customFonts);
  const cs = restaurant?.currencySymbol || 'ر.س';

  return (
    <div className="min-h-screen relative" style={{ background: `linear-gradient(135deg, ${c.bg1} 0%, ${c.bg2} 100%)` }}>
      {c.backgroundPattern !== "none" && <PatternOverlay patternId={c.backgroundPattern} accentColor={c.accent} />}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: `linear-gradient(to right, transparent, ${c.accent}66, transparent)` }} />
        <div className="absolute top-20 right-20 w-40 h-40 rounded-full blur-3xl" style={{ background: `${c.accent}0d` }} />
        <div className="absolute bottom-40 left-20 w-60 h-60 bg-[#ff00ff]/5 rounded-full blur-3xl" />
      </div>
      <TemplateHeader restaurant={restaurant} accentColor={c.accent} textColor={c.textColor} />
      <MenuBrowseArea
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        offers={offers || []}
        categories={categories}
        activeCategoryId={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredItems={filteredItems}
        accentColor={c.accent}
        textColor={c.textColor}
        searchBgStyle={`${c.bg1}f2`}
        cardBg={`${c.card}e6`}
        cardStyle="border border-white/10 transition-shadow"
        currencySymbol={cs}
        fontStyles={fs}
        tableNumber={tableNumber}
      />
      <TemplateFooter accentColor={c.accent} textColor={c.textColor} />
      <ScrollTopButton show={showScrollTop} accentColor={c.accent} />
    </div>
  );
}

// ============================================
// SHARED COMPONENTS
// ============================================

/** Pattern overlay for background */
function PatternOverlay({ patternId, accentColor }: { patternId: string; accentColor: string }) {
  const pattern = BACKGROUND_PATTERNS.find(p => p.id === patternId);
  if (!pattern || pattern.id === "none") return null;
  const bgImage = pattern.css(accentColor);
  const bgSize = getPatternSize(patternId);
  const bgPosition = getPatternPosition(patternId);
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: bgImage,
        backgroundSize: bgSize,
        backgroundPosition: bgPosition,
        opacity: 0.6,
      }}
    />
  );
}

function TemplateHeader({ restaurant, accentColor, textColor, titleExtra }: { restaurant: any; accentColor: string; textColor?: string; titleExtra?: React.ReactNode }) {
  const tc = textColor || "white";
  const [showHours, setShowHours] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const openStatus = restaurant.workingHours
    ? getOpenStatusFromRestaurant({ workingHours: restaurant.workingHours })
    : null;
  const hasContactInfo = restaurant.phone || restaurant.address || restaurant.whatsapp || restaurant.instagram || restaurant.snapchat || restaurant.xTwitter || restaurant.locationUrl;

  return (
    <header className="relative">
      {resolveImageUrl(restaurant.coverUrl) ? (
        <div className="h-48 sm:h-56 relative overflow-hidden">
          <img src={resolveImageUrl(restaurant.coverUrl)} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3), transparent)` }} />
        </div>
      ) : (
        <div className="h-32 sm:h-40 relative" style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)` }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.5), transparent)` }} />
        </div>
      )}
      <div className="container relative -mt-16 pb-4">
        <div className="flex items-end gap-4">
          {resolveImageUrl(restaurant.logoUrl) ? (
            <img src={resolveImageUrl(restaurant.logoUrl)} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-xl" style={{ border: `3px solid ${accentColor}40` }} />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-xl flex items-center justify-center" style={{ background: `${accentColor}15`, border: `3px solid ${accentColor}40` }}>
              <Store className="w-10 h-10" style={{ color: accentColor }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate" style={{ color: tc }}>
              {titleExtra}{restaurant.nameAr}
            </h1>
            {restaurant.descriptionAr && (
              <p className="text-sm mt-1 opacity-60 line-clamp-1" style={{ color: tc }}>{restaurant.descriptionAr}</p>
            )}
          </div>
        </div>

        {/* Compact Status Row: Open/Closed badge + Contact info button */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {/* Temporary Closure Banner - compact */}
          {restaurant.temporaryClosure && (() => {
            try {
              const closure = typeof restaurant.temporaryClosure === 'string' ? JSON.parse(restaurant.temporaryClosure) : restaurant.temporaryClosure;
              if (!closure.active) return null;
              return (
                <div className="w-full p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-400">المطعم مغلق مؤقتاً</span>
                  {closure.message && <span className="text-xs opacity-70 mr-1" style={{ color: tc }}>- {closure.message}</span>}
                </div>
              );
            } catch { return null; }
          })()}

          {/* Open/Closed Badge - clickable to expand hours */}
          {openStatus && (
            <button
              onClick={() => setShowHours(!showHours)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
              style={{ background: openStatus.isOpenNow ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${openStatus.isOpenNow ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}
            >
              <Clock className="w-3.5 h-3.5" style={{ color: openStatus.isOpenNow ? '#22c55e' : '#ef4444' }} />
              <span style={{ color: openStatus.isOpenNow ? '#22c55e' : '#ef4444' }}>
                {openStatus.isOpenNow ? 'مفتوح الآن' : 'مغلق الآن'}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showHours ? 'rotate-180' : ''}`} style={{ color: tc, opacity: 0.5 }} />
            </button>
          )}

          {/* Contact Info Button */}
          {hasContactInfo && (
            <button
              onClick={() => setShowContact(!showContact)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}25` }}
            >
              <Info className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span style={{ color: tc, opacity: 0.8 }}>معلومات التواصل</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showContact ? 'rotate-180' : ''}`} style={{ color: tc, opacity: 0.5 }} />
            </button>
          )}
        </div>

        {/* Expandable: Working Hours */}
        <AnimatePresence>
          {showHours && openStatus && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-3 rounded-xl" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}>
                <div className="grid grid-cols-1 gap-1">
                  {(() => {
                    const dayNamesAr: Record<string, string> = { sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت' };
                    return openStatus.days.map(day => {
                      const h = openStatus.hours[day];
                      const isToday = day === openStatus.currentDay;
                      return (
                        <div key={day} className={`flex items-center justify-between text-xs py-1 px-2 rounded ${isToday ? 'bg-white/10' : ''}`} style={{ color: tc }}>
                          <span className={isToday ? 'font-semibold' : 'opacity-60'}>{dayNamesAr[day]}</span>
                          {h?.closed ? (
                            <span className="opacity-40">مغلق</span>
                          ) : (
                            <span className={isToday ? 'font-medium' : 'opacity-70'} dir="ltr">{h?.open} - {h?.close}</span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                {/* Upcoming Holidays inside hours section */}
                {restaurant.holidays && restaurant.holidays.length > 0 && (() => {
                  const today = todayYmd();
                  const upcoming = restaurant.holidays.filter((h: any) => h.date >= today).slice(0, 3);
                  if (upcoming.length === 0) return null;
                  return (
                    <div className="mt-2 pt-2 border-t" style={{ borderColor: `${accentColor}20` }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3 h-3" style={{ color: accentColor }} />
                        <span className="text-[10px] font-semibold opacity-70" style={{ color: tc }}>عطلات قادمة</span>
                      </div>
                      {upcoming.map((h: any) => (
                        <div key={h.id} className="flex items-center justify-between text-xs py-0.5 px-2" style={{ color: tc }}>
                          <span className="opacity-70">{h.titleAr}</span>
                          <div className="flex items-center gap-2">
                            <span className="opacity-50 text-[10px]">{h.date}</span>
                            {h.isFullDayClosed ? (
                              <span className="text-amber-400 text-[10px] font-medium">مغلق</span>
                            ) : (
                              <span className="opacity-60 text-[10px]" dir="ltr">{h.openTime} - {h.closeTime}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable: Contact Info */}
        <AnimatePresence>
          {showContact && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-3 rounded-xl" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}>
                {/* Phone & Address */}
                <div className="space-y-2">
                  {restaurant.phone && (
                    <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity" style={{ color: tc }}>
                      <Phone className="w-4 h-4" style={{ color: accentColor }} />
                      <span dir="ltr">{restaurant.phone}</span>
                    </a>
                  )}
                  {restaurant.address && (
                    <div className="flex items-center gap-2 text-sm opacity-80" style={{ color: tc }}>
                      <MapPin className="w-4 h-4" style={{ color: accentColor }} />
                      <span>{restaurant.address}</span>
                    </div>
                  )}
                </div>
                {/* Social Media Icons */}
                {(restaurant.whatsapp || restaurant.instagram || restaurant.snapchat || restaurant.xTwitter || restaurant.locationUrl) && (
                  <div className="flex flex-wrap gap-2.5 mt-3 pt-2 border-t" style={{ borderColor: `${accentColor}20` }}>
                    {restaurant.whatsapp && (
                      <a href={`https://wa.me/${restaurant.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: '#25D366' }} title="WhatsApp">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </a>
                    )}
                    {restaurant.instagram && (
                      <a href={`https://instagram.com/${restaurant.instagram}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }} title="Instagram">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      </a>
                    )}
                    {restaurant.snapchat && (
                      <a href={`https://snapchat.com/add/${restaurant.snapchat}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: '#FFFC00' }} title="Snapchat">
                        <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.922-.214.04-.012.06-.012.08-.012.16 0 .3.075.36.18.08.12.08.27.019.39-.12.21-.481.39-.764.45l-.009.003c-.09.03-.18.06-.27.09-.21.06-.45.12-.57.18-.12.06-.18.15-.18.27 0 .03.003.06.009.09.45 1.62 1.86 2.79 3.15 3.06.12.03.18.12.18.21 0 .12-.12.24-.36.3-.48.12-1.02.18-1.38.27-.12.03-.18.09-.18.18 0 .03.003.06.009.09.06.18.12.36.12.54 0 .12-.06.24-.18.3-.12.06-.27.09-.42.09-.18 0-.36-.03-.54-.09-.27-.09-.57-.15-.84-.15-.09 0-.18.003-.27.009-.6.06-1.2.48-2.1.96-.84.45-1.77.96-3.21.96h-.03c-1.44 0-2.37-.51-3.21-.96-.9-.48-1.5-.9-2.1-.96-.09-.006-.18-.009-.27-.009-.27 0-.57.06-.84.15-.18.06-.36.09-.54.09-.15 0-.3-.03-.42-.09-.12-.06-.18-.18-.18-.3 0-.18.06-.36.12-.54.006-.03.009-.06.009-.09 0-.09-.06-.15-.18-.18-.36-.09-.9-.15-1.38-.27-.24-.06-.36-.18-.36-.3 0-.09.06-.18.18-.21 1.29-.27 2.7-1.44 3.15-3.06.006-.03.009-.06.009-.09 0-.12-.06-.21-.18-.27-.12-.06-.36-.12-.57-.18-.09-.03-.18-.06-.27-.09l-.009-.003c-.283-.06-.644-.24-.764-.45-.061-.12-.061-.27.019-.39.06-.105.2-.18.36-.18.02 0 .04 0 .08.012.263.094.622.198.922.214.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.653 1.069 11.016.793 12.006.793h.2z"/></svg>
                      </a>
                    )}
                    {restaurant.xTwitter && (
                      <a href={`https://x.com/${restaurant.xTwitter}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: '#000000' }} title="X">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    )}
                    {restaurant.locationUrl && (
                      <a href={restaurant.locationUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: '#4285F4' }} title="Location">
                        <MapPin className="w-5 h-5 text-white" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function TemplateFooter({ accentColor, textColor }: { accentColor: string; textColor?: string }) {
  return (
    <footer className="py-6 border-t border-white/10">
      <div className="container text-center">
        <p className="text-xs opacity-50" style={{ color: textColor || "white" }}>
          مدعوم بواسطة <span className="font-medium" style={{ color: accentColor }}>mineuqr</span>
        </p>
      </div>
    </footer>
  );
}

function ScrollTopButton({ show, accentColor }: { show: boolean; accentColor: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 left-6 w-10 h-10 rounded-full shadow-lg flex items-center justify-center z-50"
          style={{ background: accentColor, color: "#000" }}
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// Template renderer
export function getTemplateComponent(templateId: string) {
  switch (templateId) {
    case "elegant": return ElegantTemplate;
    case "modern": return ModernTemplate;
    case "dark": return DarkTemplate;
    case "warm": return WarmTemplate;
    case "ocean": return OceanTemplate;
    case "royal": return RoyalTemplate;
    case "neon": return NeonTemplate;
    case "classic":
    default: return ClassicTemplate;
  }
}
