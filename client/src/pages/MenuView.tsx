import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Loader2, AlertCircle, Store } from "lucide-react";
import { getTemplateComponent, type MenuBrowseTab } from "@/components/MenuTemplates";
import { DiningSessionBanner } from "@/components/customer/DiningSessionBanner";
import { useLanguage } from "@/contexts/LanguageContext";
import CartDrawer from "@/components/CartDrawer";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import {
  isDiningSessionOrderingEnabled,
} from "@/lib/diningSessionRecovery";
import { useDiningSessionRecovery } from "@/hooks/useDiningSessionRecovery";
import { usePostSubmissionGuard } from "@/hooks/usePostSubmissionGuard";
import { PostSubmissionLockedScreen } from "@/components/customer/PostSubmissionLockedScreen";
import { useQrOrderingRuntime } from "@/hooks/useQrOrderingRuntime";

/**
 * ORDERING-CLIENT-RUNTIME-1 — Menu consumes Ordering Runtime via Client Platform
 * (`useQrOrderingRuntime` → hosted context or shared `useOrderingRuntime`).
 * Session recovery + post-submission remain channel experience concerns.
 */
export default function MenuView() {
  const [, params] = useRoute("/menu/:slug/table/:tableNumber");
  const [, params2] = useRoute("/menu/:slug");
  const slug = params?.slug || params2?.slug || "";
  const tableNumber = params?.tableNumber ? parseInt(params.tableNumber) : 0;
  const { t, dir, language } = useLanguage();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const {
    restaurant,
    isLoading: restaurantLoading,
    categories: categoriesList,
    items: allItems,
    offers: activeOffers,
    holidays,
    gates,
  } = useQrOrderingRuntime(slug);

  const canOrder = gates.guestOrderingEnabled;
  const orderingAllowed = gates.orderingAllowed;

  const { recovery, recoveryDone } = useDiningSessionRecovery({
    slug,
    tableNumber,
    restaurantId: restaurant?.id,
    client: {
      getByToken: (input) => utils.client.session.getByToken.query(input),
      getActiveByTable: (input) => utils.client.session.getActiveByTable.query(input),
    },
  });

  const lang = language === "ar" ? "ar" : "en";
  const sessionAllowsOrder = isDiningSessionOrderingEnabled(recovery);
  const postSubmission = usePostSubmissionGuard({
    slug,
    tableNumber,
    recovery,
    recoveryDone,
  });

  const canPlaceOrder =
    tableNumber > 0 &&
    gates.platformCanPlaceOrder &&
    sessionAllowsOrder &&
    recoveryDone &&
    !postSubmission.blocked;
  const orderingTableNumber = canPlaceOrder ? tableNumber : 0;
  const showClosedNotice = tableNumber > 0 && canOrder && !orderingAllowed;
  const bannerStatus = recovery.session?.status ?? recovery.endedStatus;
  const showSessionBanner =
    tableNumber > 0 && recoveryDone && bannerStatus != null;

  const trackViewMutation = trpc.restaurant.trackView.useMutation();

  useEffect(() => {
    if (slug) {
      trackViewMutation.mutate({ slug });
    }
  }, [slug]);

  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [menuTab, setMenuTab] = useState<MenuBrowseTab>("menu");

  useEffect(() => {
    if (categoriesList?.length && !activeCategoryId) {
      setActiveCategoryId(categoriesList[0].id);
    }
  }, [categoriesList]);

  useEffect(() => {
    if (!activeOffers?.length && menuTab === "offers") {
      setMenuTab("menu");
    }
  }, [activeOffers?.length, menuTab]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredItems = useMemo(() => {
    if (!allItems) return [];
    let items = allItems;
    if (activeCategoryId) {
      items = items.filter((item: any) => item.categoryId === activeCategoryId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item: any) =>
          item.nameAr.toLowerCase().includes(q) ||
          (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
          (item.descriptionAr && item.descriptionAr.toLowerCase().includes(q))
      );
    }
    return items;
  }, [allItems, activeCategoryId, searchQuery]);

  const customColors = useMemo(() => {
    const raw = (restaurant as any)?.customColors;
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }, [(restaurant as any)?.customColors]);

  const customFonts = useMemo(() => {
    const raw = (restaurant as any)?.customFonts;
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }, [(restaurant as any)?.customFonts]);

  const templateId = (restaurant as any)?.menuTemplate || "classic";
  const TemplateComponent = useMemo(() => getTemplateComponent(templateId), [templateId]);

  const welcomeAccentColor = useMemo(() => {
    if (customColors?.accent) return customColors.accent;
    const tmpl = templateId as string;
    const templates: Record<string, string> = { classic: '#14b8a6', elegant: '#d4a853', modern: '#f093fb', dark: '#ef4444', warm: '#f97316', ocean: '#00d2ff', royal: '#fbbf24', neon: '#39ff14' };
    return templates[tmpl] || '#14b8a6';
  }, [templateId, customColors]);

  const bannerOffsetClass = showClosedNotice ? "top-10" : undefined;

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14b8a6]" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4" dir={dir}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{t('menu.menuNotFound')}</h2>
          <p className="text-white/50">{t('menu.menuNotFoundDesc')}</p>
        </div>
      </div>
    );
  }

  if (!restaurant.isActive) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4" dir={dir}>
        <div className="text-center">
          <Store className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{t('menu.menuUnavailable')}</h2>
          <p className="text-white/50">{t('menu.menuUnavailableDesc')}</p>
        </div>
      </div>
    );
  }

  if (tableNumber > 0 && recoveryDone && postSubmission.blocked) {
    return (
      <PostSubmissionLockedScreen
        language={lang}
        trackingPath={postSubmission.trackingPath}
        onOpenTracking={
          postSubmission.trackingPath
            ? () => setLocation(postSubmission.trackingPath!, { replace: true })
            : undefined
        }
      />
    );
  }

  return (
    <>
      <WelcomeOverlay
        restaurantName={restaurant.nameAr}
        logoUrl={(restaurant as any)?.logoUrl}
        accentColor={welcomeAccentColor}
      />
      {showClosedNotice && (
        <div
          className="fixed top-0 left-0 right-0 z-[90] px-4 py-2 text-center text-sm font-medium bg-red-500/90 text-white shadow-md"
          dir={dir}
        >
          {language === "ar" ? "المطعم مغلق حالياً" : "The restaurant is closed right now"}
        </div>
      )}
      {showSessionBanner && bannerStatus && (
        <DiningSessionBanner
          language={lang}
          status={bannerStatus}
          className={bannerOffsetClass}
        />
      )}
      <TemplateComponent
        restaurant={{ ...restaurant, holidays: holidays || [] }}
        categories={categoriesList || []}
        items={allItems || []}
        activeCategoryId={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredItems={filteredItems}
        showScrollTop={showScrollTop}
        customColors={customColors}
        customFonts={customFonts}
        offers={activeOffers || []}
        tableNumber={orderingTableNumber}
        menuTab={menuTab}
        setMenuTab={setMenuTab}
      />
      {canPlaceOrder && (
        <CartDrawer
          slug={slug}
          tableNumber={tableNumber}
          currencySymbol={(restaurant as any)?.currencySymbol || "ر.س"}
          tableLabel={(restaurant as any)?.tableLabel || "tables"}
        />
      )}
    </>
  );
}
