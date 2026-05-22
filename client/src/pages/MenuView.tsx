import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Loader2, AlertCircle, Store } from "lucide-react";
import { getTemplateComponent } from "@/components/MenuTemplates";
import { useLanguage } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import CartDrawer from "@/components/CartDrawer";
import WelcomeOverlay from "@/components/WelcomeOverlay";

export default function MenuView() {
  const [, params] = useRoute("/menu/:slug/table/:tableNumber");
  const [, params2] = useRoute("/menu/:slug");
  const slug = params?.slug || params2?.slug || "";
  const tableNumber = params?.tableNumber ? parseInt(params.tableNumber) : 0;
  const { t, dir } = useLanguage();

  const { data: restaurant, isLoading: restaurantLoading } = trpc.restaurant.getBySlug.useQuery(
    { slug },
    { enabled: !!slug, staleTime: 0, gcTime: 0, refetchOnMount: "always" }
  );

  const { data: categoriesList } = trpc.category.listPublic.useQuery(
    { restaurantId: restaurant?.id ?? 0 },
    { enabled: !!restaurant?.id, staleTime: 0, gcTime: 0, refetchOnMount: "always" }
  );

  const { data: allItems } = trpc.menuItem.listByRestaurant.useQuery(
    { restaurantId: restaurant?.id ?? 0 },
    { enabled: !!restaurant?.id, staleTime: 0, gcTime: 0, refetchOnMount: "always" }
  );

  const { data: activeOffers } = trpc.offer.listActive.useQuery(
    { restaurantId: restaurant?.id ?? 0 },
    { enabled: !!restaurant?.id, staleTime: 0, gcTime: 0, refetchOnMount: "always" }
  );
  const { data: holidays } = trpc.holiday.listPublic.useQuery(
    { restaurantId: restaurant?.id ?? 0 },
    { enabled: !!restaurant?.id, staleTime: 0, gcTime: 0, refetchOnMount: "always" }
  );

  const { data: tableData } = trpc.table.getByNumber.useQuery(
    { restaurantId: restaurant?.id ?? 0, tableNumber },
    { enabled: !!restaurant?.id && tableNumber > 0, staleTime: 0, gcTime: 0, refetchOnMount: "always" }
  );

  const { data: orderCheck } = trpc.order.canOrder.useQuery(
    { restaurantId: restaurant?.id ?? 0 },
    { enabled: !!restaurant?.id && tableNumber > 0, staleTime: 0, gcTime: 0, refetchOnMount: "always" }
  );
  const canOrder = orderCheck?.canOrder ?? false;

  const trackViewMutation = trpc.restaurant.trackView.useMutation();

  useEffect(() => {
    if (slug) {
      trackViewMutation.mutate({ slug });
    }
  }, [slug]);

  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    if (categoriesList?.length && !activeCategoryId) {
      setActiveCategoryId(categoriesList[0].id);
    }
  }, [categoriesList]);

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

  return (
    <CartProvider>
      <WelcomeOverlay
        restaurantName={restaurant.nameAr}
        logoUrl={(restaurant as any)?.logoUrl}
        accentColor={welcomeAccentColor}
      />
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
        tableNumber={canOrder ? tableNumber : 0}
      />
      {tableNumber > 0 && canOrder && (
        <CartDrawer
          restaurantId={restaurant.id}
          tableId={tableData?.id || 0}
          tableNumber={tableNumber}
          whatsapp={(restaurant as any)?.whatsapp}
          currencySymbol={(restaurant as any)?.currencySymbol || "ر.س"}
          restaurantName={restaurant.nameAr}
          tableLabel={(restaurant as any)?.tableLabel || 'tables'}
        />
      )}
    </CartProvider>
  );
}
