import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { useEffect, useMemo } from "react";
import { Loader2, AlertCircle, Store } from "lucide-react";
import { getTemplateComponent } from "@/components/MenuTemplates";
import { DiningSessionBanner } from "@/components/customer/DiningSessionBanner";
import { useLanguage } from "@/contexts/LanguageContext";
import CartDrawer, { restaurantTableLabel } from "@/components/CartDrawer";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import {
  isDiningSessionOrderingEnabled,
} from "@/lib/diningSessionRecovery";
import { useDiningSessionRecovery } from "@/hooks/useDiningSessionRecovery";
import { usePostSubmissionGuard } from "@/hooks/usePostSubmissionGuard";
import { PostSubmissionLockedScreen } from "@/components/customer/PostSubmissionLockedScreen";
import { FrozenPublicMenuExperience } from "@/components/commercial";
import {
  QrBrowseOnlyHost,
  useOrderingBrowse,
  useOrderingClientRuntime,
  useOptionalOrderingBrowse,
  useOptionalOrderingClientRuntime,
} from "@/lib/ordering-client";

/**
 * ORDERING-CLIENT-BROWSE-1 — QR menu shell.
 * Channel owns: bootstrap routes, dining session, post-submission, tracking, view tracking.
 * Browse orchestration (category/search/tabs/filter/loading) is Ordering Client Platform.
 */
export default function MenuView() {
  const [, params] = useRoute("/menu/:slug/table/:tableNumber");
  const [, params2] = useRoute("/menu/:slug");
  const slug = params?.slug || params2?.slug || "";
  const hosted = useOptionalOrderingClientRuntime();
  const hostedBrowse = useOptionalOrderingBrowse();

  if (hosted && hosted.slug === slug && hostedBrowse) {
    return <QrMenuChannelShell />;
  }

  return (
    <QrBrowseOnlyHost slug={slug}>
      <QrMenuChannelShell />
    </QrBrowseOnlyHost>
  );
}

function QrMenuChannelShell() {
  const [, params] = useRoute("/menu/:slug/table/:tableNumber");
  const [, params2] = useRoute("/menu/:slug");
  const slug = params?.slug || params2?.slug || "";
  const tableNumber = params?.tableNumber ? parseInt(params.tableNumber) : 0;
  const { t, dir, language } = useLanguage();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const browse = useOrderingBrowse();
  const runtime = useOrderingClientRuntime();

  const restaurant = browse.restaurant as {
    id?: number;
    nameAr?: string;
    logoUrl?: string;
    isActive?: boolean;
    customColors?: unknown;
    customFonts?: unknown;
    menuTemplate?: string;
    currencySymbol?: string;
    tableLabel?: string;
  } | null;

  const canOrder = browse.gates.guestOrderingEnabled;
  const orderingAllowed = browse.gates.orderingAllowed;

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
    browse.gates.platformCanPlaceOrder &&
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

  const customColors = useMemo(() => {
    const raw = restaurant?.customColors;
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }, [restaurant?.customColors]);

  const customFonts = useMemo(() => {
    const raw = restaurant?.customFonts;
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }, [restaurant?.customFonts]);

  const templateId = restaurant?.menuTemplate || "classic";
  const TemplateComponent = useMemo(() => getTemplateComponent(templateId), [templateId]);

  const welcomeAccentColor = useMemo(() => {
    if (customColors?.accent) return customColors.accent;
    const tmpl = templateId as string;
    const templates: Record<string, string> = {
      classic: "#14b8a6",
      elegant: "#d4a853",
      modern: "#f093fb",
      dark: "#ef4444",
      warm: "#f97316",
      ocean: "#00d2ff",
      royal: "#fbbf24",
      neon: "#39ff14",
    };
    return templates[tmpl] || "#14b8a6";
  }, [templateId, customColors]);

  const bannerOffsetClass = showClosedNotice ? "top-10" : undefined;

  if (browse.presentationStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14b8a6]" />
      </div>
    );
  }

  if (browse.gates.commercialFrozen) {
    return (
      <FrozenPublicMenuExperience
        language={language}
        restaurantName={restaurant?.nameAr}
      />
    );
  }

  if (browse.presentationStatus === "not_found" || !restaurant) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4" dir={dir}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{t("menu.menuNotFound")}</h2>
          <p className="text-white/50">{t("menu.menuNotFoundDesc")}</p>
        </div>
      </div>
    );
  }

  if (browse.presentationStatus === "unavailable") {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4" dir={dir}>
        <div className="text-center">
          <Store className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{t("menu.menuUnavailable")}</h2>
          <p className="text-white/50">{t("menu.menuUnavailableDesc")}</p>
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
        restaurantName={restaurant.nameAr ?? ""}
        logoUrl={restaurant.logoUrl}
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
        restaurant={{ ...restaurant, holidays: runtime.holidays || [] }}
        categories={browse.categories}
        items={browse.items}
        activeCategoryId={browse.activeCategoryId}
        setActiveCategoryId={browse.setActiveCategoryId}
        searchQuery={browse.searchQuery}
        setSearchQuery={browse.setSearchQuery}
        filteredItems={browse.filteredItems}
        showScrollTop={browse.showScrollTop}
        customColors={customColors}
        customFonts={customFonts}
        offers={browse.offers || []}
        tableNumber={orderingTableNumber}
        menuTab={browse.menuTab}
        setMenuTab={browse.setMenuTab}
      />
      {canPlaceOrder && (
        <CartDrawer
          slug={slug}
          tableNumber={tableNumber}
          currencySymbol={restaurant.currencySymbol || "ر.س"}
          tableLabel={restaurantTableLabel(restaurant.tableLabel)}
        />
      )}
    </>
  );
}
