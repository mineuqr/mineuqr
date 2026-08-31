import { useAuth } from "@/_core/hooks/useAuth";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { Button } from "@/components/ui/button";
import OrderAlertSystem from "@/components/OrderAlertSystem";
import { DiningSessionWorkspaceSheet } from "@/components/dashboard/DiningSessionWorkspaceSheet";
import { ActiveSessionsPreviewSection } from "@/components/dashboard/ActiveSessionsPreviewSection";
import { SessionsWorkspacePanel } from "@/components/dashboard/SessionsWorkspacePanel";
import { OrdersWorkspacePanel } from "@/components/orders-workspace/OrdersWorkspacePanel";
import { CashierRouteFallback } from "@/components/cashier-workspace/CashierRouteFallback";
import { CashierWorkspacePanel } from "@/components/cashier-workspace/CashierWorkspacePanel";
import {
  OperationalOrderCard,
  mapDashboardOrderPresentation,
} from "@/design-system/operational-order-card";
import { formatProjectedFulfilmentLabel } from "@/lib/order-presentation/formatProjectedFulfilment";
import { formatOperationalOrderHeading } from "@/lib/operational-workspace/orderDisplayIdentity";
import { ScreenManagementWorkspacePanel } from "@/components/screen-management/ScreenManagementWorkspacePanel";
import { ProvisioningWorkspacePanel } from "@/components/screen-provisioning/ProvisioningWorkspacePanel";
import { PrintWorkspacePanel } from "@/components/print-workspace/PrintWorkspacePanel";
import { PrinterManagementPanel } from "@/components/printer-management/PrinterManagementPanel";
import { ActionCenterSection } from "@/components/dashboard/ActionCenterSection";
import { OperationalActivityFeedSection } from "@/components/dashboard/OperationalActivityFeedSection";
import { OperationalSnapshotSection } from "@/components/dashboard/OperationalSnapshotSection";
import { ReportsTab } from "@/components/dashboard/ReportsTab";
import { SettlementHistoryPanel } from "@/components/settlement-record/SettlementHistoryPanel";
import { RegisterOperationsPanel } from "@/components/register-operations/RegisterOperationsPanel";
import { RegisterCatalogPanel } from "@/components/register-catalog/RegisterCatalogPanel";
import { SemanticKpiCard, SEMANTIC_KPI_GRID, type SemanticTone } from "@/design-system/semantic-card";
import {
  RestaurantOperationsShell,
  type RestaurantTab,
} from "@/components/dashboard/layout";
import type { AdminBreadcrumbItem } from "@/components/admin/layout/AdminShellBreadcrumbs";
import { restaurantDash, restaurantHoverGlow } from "@/components/dashboard/restaurantDashStyles";
import { getLoginUrl, spaNavigate } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn, resolveImageUrl } from "@/lib/utils";
import { resolveOfferImageUrl } from "@/lib/offers/offerImage";
import type { OfferImageSource } from "@/lib/offers/offerImage";
import {
  OfferImageUpload,
  uploadPendingOfferImage,
} from "@/components/offers/OfferImageUpload";
import { OfferImagePlaceholder } from "@/components/offers/OfferImagePlaceholder";
import { formatRiyadhDateTime, todayYmd, convertUtcToRestaurantTime } from "@/lib/datetime";
import { formatLocaleDateTime } from "@/lib/numericPresentation";
import {
  buildVisibleSessionOrderCounts,
  formatDashboardSessionLabel,
  formatDashboardSessionOrderCount,
  hasDashboardSession,
} from "@/lib/diningSessionDashboardCopy";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  orderListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { useDashboardNavigation } from "@/lib/useDashboardNavigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { OwnerAccessControl } from "@/components/owner-access/OwnerAccessControl";
import {
  Plus, Store, LayoutGrid, UtensilsCrossed,
  BarChart3, Eye, Trash2, Pencil, ArrowRight,
  ChevronLeft, Home, Settings, Image as ImageIcon, Loader2,
  Check, X, Upload, GripVertical, Palette, Tag, Calendar, Clock, User, Bell,
  AlertTriangle, CalendarPlus, ClipboardList, Download, Copy,
  CheckCircle2,
  Menu, CreditCard, Sparkles, Globe
} from "lucide-react";
import { useState, useRef, useCallback, useEffect, useMemo, type ComponentType, type ReactElement } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  CountBadge,
  SemanticBadge,
  mapOfferTypeToBadgeTone,
  mapOrderStatusToBadgeTone,
  semanticBadgeToneClass,
} from "@/design-system/semantic-badge";
import {
  formatOrderStatusLabel,
  type OrderLifecycleStatus,
} from "@/lib/orderStatusDisplay";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { SemanticConfirmDialog } from "@/design-system/semantic-confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { isEmailNotVerifiedError, toastTrpcError } from "@/lib/trpcErrors";
import {
  formatUserFacingQueryError,
  isSuccessfulCollectionResult,
  isSuccessfulEmptyCollection,
  resolveAsyncUiState,
  userFacingErrorTitle,
} from "@/lib/ui-state";
import {
  AppEmptyState,
  AppEmptyStateActionButton,
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
  AppUnauthorizedState,
} from "@/components/app-state";
import { QRCodeSVG } from "qrcode.react";
import { QRWithLogo } from "@/components/QRWithLogo";
import { useCommercialFeatureVisibility } from "@/hooks/useCommercialFeatureVisibility";
import { useFrozenCommercialRouteGuard } from "@/hooks/useFrozenCommercialRouteGuard";
import { CommercialUpgradeBanner } from "@/components/commercial";
import {
  RestaurantBasicInfoSection,
  RestaurantContactLinksSection,
  RestaurantFinancialPolicySection,
  SaudiTaxProfileSection,
  WorkingHoursEditor,
} from "@/components/RestaurantSettingsSections";
import {
  buildBusinessTaxPolicyDocument,
  extractPrimaryTaxRatePercent,
  getCountryFinancialPolicySuggestion,
  resolveTaxMode,
  validateTaxRatePercent,
  type CountryFinancialPolicySuggestion,
} from "@/lib/businessTaxPolicySettings";
import type { CheckTaxMode } from "@shared/operational-session";

// ─── Dashboard UI primitives (Stripe / Linear–style) ─────────

const dash = {
  shell: restaurantDash.shell,
  card: restaurantDash.card,
  cardHover: cn(restaurantDash.card, restaurantHoverGlow),
  hero: restaurantDash.hero,
  kpiCard: restaurantDash.kpiCard,
  pageTitle: "text-2xl font-bold tracking-tight text-white sm:text-3xl",
  pageSub: "mt-1 max-w-2xl text-sm leading-relaxed text-slate-400",
  stack: restaurantDash.stack,
  section: restaurantDash.section,
  label: "text-xs font-semibold uppercase tracking-[0.1em] text-slate-500",
  group: cn(restaurantDash.panel, "p-4 sm:p-6 lg:p-7"),
  groupDivider: "border-t border-slate-700/40 pt-5 sm:pt-6",
  contentPanel: cn(restaurantDash.panel, "p-4 sm:p-6 lg:p-7"),
  emptyPanel: restaurantDash.emptyPanel,
};

type DashTab = { id: string; label: string; icon: ComponentType<{ className?: string }> };

function restaurantTabLabel(tab: RestaurantTab, language: string, t: (key: string) => string): string {
  const labels: Record<RestaurantTab, string> = {
    home: language === "ar" ? "لوحة التحكم" : "Dashboard",
    sessions: language === "ar" ? "الجلسات" : "Sessions",
    orders: language === "ar" ? "الطلبات" : "Orders",
    cashier: language === "ar" ? "الكاشير" : "Cashier",
    settlements: language === "ar" ? "التسويات" : "Settlements",
    register: language === "ar" ? "عمليات الصندوق" : "Register Ops",
    "register-catalog": language === "ar" ? "إنشاء صندوق" : "Create register",
    screens: language === "ar" ? "إدارة الشاشات" : "Screen Management",
    devices: language === "ar" ? "إدارة الشاشات" : "Screen Management",
    "screen-provisioning": language === "ar" ? "تجهيز الشاشة" : "Screen Provisioning",
    print: language === "ar" ? "مساحة الطباعة" : "Print Workspace",
    "printer-management": language === "ar" ? "إدارة الطابعات" : "Printer Management",
    reports: language === "ar" ? "التقارير والإحصائيات" : "Reports & Statistics",
    categories: t("dashboard.categoriesAndItems"),
    offers: t("dashboard.offers"),
    tables: language === "ar" ? "الطاولات" : "Tables",
    qr: language === "ar" ? "رموز QR" : "QR Codes",
    templates: language === "ar" ? "قوالب المنيو" : "Menu Templates",
    settings: t("dashboard.settings"),
  };
  return labels[tab];
}

function DashboardStatCard({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
  valueVariant = "operational",
}: {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: SemanticTone;
  hint?: string;
  valueVariant?: "operational" | "revenue";
}) {
  return (
    <SemanticKpiCard
      label={label}
      value={value}
      icon={icon}
      tone={tone}
      domain="analytics"
      hint={hint}
      valueVariant={valueVariant}
    />
  );
}

// ─── Dashboard loading skeleton (auth.me in flight) ─────────

function DashboardMainSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-1">
      <div className="h-8 w-56 max-w-full rounded-lg bg-muted/40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/30" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-muted/25" />
      <div className="h-32 rounded-2xl bg-muted/20" />
    </div>
  );
}

// ─── Dashboard Layout ───────────────────────────────────────

export default function Dashboard() {
  const gate = useAuthGate();
  const { user, authPending, authResolved, isAuthenticated, logout } = gate;
  const frozenGuard = useFrozenCommercialRouteGuard();
  const { t, language, dir } = useLanguage();

  const {
    activeSection,
    selectedRestaurantId,
    restaurantTab,
    needsRestaurantResolve,
    restaurantsResolving,
    navigateToRestaurant,
    navigateToRestaurantsList,
    navigateToTab,
  } = useDashboardNavigation(authResolved, isAuthenticated);

  const { data: sidebarRestaurant } = trpc.restaurant.getById.useQuery(
    { id: selectedRestaurantId! },
    {
      enabled:
        authResolved &&
        isAuthenticated &&
        !!selectedRestaurantId &&
        activeSection === "restaurant-detail",
    }
  );

  const handleSelectRestaurant = navigateToRestaurant;
  const handleBackToRestaurants = navigateToRestaurantsList;
  const handleRestaurantTabChange = navigateToTab;

  const tablesLabel =
    sidebarRestaurant?.tableLabel === "rooms"
      ? language === "ar"
        ? "الغرف"
        : "Rooms"
      : language === "ar"
        ? "الطاولات"
        : "Tables";

  const shellBreadcrumbs = useMemo((): AdminBreadcrumbItem[] => {
    const myRestaurantsLabel = language === "ar" ? "مطاعمي" : "My Restaurants";
    if (activeSection === "restaurants") {
      return [{ label: myRestaurantsLabel }];
    }
    const restaurantName =
      language === "ar"
        ? sidebarRestaurant?.nameAr
        : (sidebarRestaurant as { nameEn?: string | null } | undefined)?.nameEn ||
          sidebarRestaurant?.nameAr;
    const crumbs: AdminBreadcrumbItem[] = [
      { label: myRestaurantsLabel, href: "/dashboard" },
    ];
    if (selectedRestaurantId && restaurantName) {
      crumbs.push({
        label: restaurantName,
        href: `/dashboard/${selectedRestaurantId}`,
      });
    }
    crumbs.push({ label: restaurantTabLabel(restaurantTab, language, t) });
    return crumbs;
  }, [
    activeSection,
    language,
    restaurantTab,
    selectedRestaurantId,
    sidebarRestaurant,
    t,
  ]);

  if (frozenGuard.isFrozen) {
    return <AppLoadingState label={t("uiState.loading")} />;
  }

  if (gate.showLoginRequired) {
    return (
      <div className={cn(dash.shell, "flex items-center justify-center p-4")} dir={dir}>
        <div className="w-full max-w-md">
          <AppUnauthorizedState
            title={t("uiState.unauthorizedTitle")}
            description={t("dashboard.pleaseLogin")}
            loginLabel={t("common.login")}
            onLogin={() => spaNavigate(getLoginUrl())}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? <OrderAlertSystem /> : null}
      <RestaurantOperationsShell
        user={user}
        activeSection={activeSection}
        restaurantTab={activeSection === "restaurant-detail" ? restaurantTab : undefined}
        onRestaurants={handleBackToRestaurants}
        onLogout={isAuthenticated ? logout : () => {}}
        onRestaurantTabChange={
          activeSection === "restaurant-detail" ? handleRestaurantTabChange : undefined
        }
        tablesLabel={tablesLabel}
        breadcrumbs={shellBreadcrumbs}
        immersive={activeSection === "restaurant-detail" && restaurantTab === "cashier"}
      >
        {isAuthenticated && restaurantTab !== "cashier" ? (
          <EmailVerificationBanner className="mb-6" />
        ) : null}
        {gate.isPending ? (
          <DashboardMainSkeleton />
        ) : activeSection === "restaurants" ? (
          <RestaurantsList onSelect={handleSelectRestaurant} userName={user?.name} />
        ) : selectedRestaurantId ? (
          <RestaurantDetail
            key={selectedRestaurantId}
            restaurantId={selectedRestaurantId}
            activeTab={restaurantTab}
            onTabChange={handleRestaurantTabChange}
            onBack={handleBackToRestaurants}
          />
        ) : needsRestaurantResolve && restaurantsResolving ? (
          <AppLoadingState label={t("uiState.loading")} />
        ) : (
          <RestaurantsList onSelect={handleSelectRestaurant} userName={user?.name} />
        )}
      </RestaurantOperationsShell>
    </>
  );
}

// ─── Restaurants List ───────────────────────────────────────

function RestaurantsList({
  onSelect,
  userName,
}: {
  onSelect: (id: number) => void;
  userName?: string | null;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const authResolved = !authPending;
  const {
    data: restaurants,
    isPending: restaurantsPending,
    isError: restaurantsError,
    error: restaurantsQueryError,
    isFetching: restaurantsFetching,
    refetch,
  } = trpc.restaurant.list.useQuery(undefined, {
    enabled: authResolved && isAuthenticated,
  });
  const { t, language } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteRestaurantId, setDeleteRestaurantId] = useState<number | null>(null);

  const listPhase = resolveAsyncUiState({
    authPending,
    isAuthenticated,
    queryPending: restaurantsPending,
    isError: restaurantsError,
    error: restaurantsQueryError,
    isSuccess: isSuccessfulCollectionResult(
      restaurantsError,
      restaurantsPending,
      restaurants
    ),
    isEmpty: isSuccessfulEmptyCollection(
      restaurantsError,
      restaurantsPending,
      restaurants
    ),
  });

  const deleteRestaurantMutation = trpc.restaurant.delete.useMutation({
    onSuccess: () => {
      toast.success(t('dashboard.restaurantDeleted'));
      setDeleteRestaurantId(null);
      refetch();
    },
    onError: (error: unknown) => {
      toastTrpcError(error, t);
    },
  });
  
  const handleDeleteRestaurant = () => {
    if (deleteRestaurantId) {
      deleteRestaurantMutation.mutate({ id: deleteRestaurantId });
    }
  };

  const totalViews = restaurants?.reduce((sum, r) => sum + (r.viewCount ?? 0), 0) ?? 0;
  const activeCount = restaurants?.filter((r) => r.isActive).length ?? 0;

  return (
    <div className={dash.stack}>
      <OwnerAccessControl />
      <div className={cn(dash.hero)}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="ui-chrome text-sm text-muted-foreground">
              {language === "ar" ? "مرحباً بعودتك 👋" : "Welcome back 👋"}
            </p>
            <h1 className={dash.pageTitle}>
              {userName || t("dashboard.user")}
            </h1>
            <p className={dash.pageSub}>
              {t("dashboard.subtitle")}
            </p>
            <Button onClick={() => setShowCreate(true)} className="mt-2 shadow-sm">
              <Plus className="h-4 w-4" />
              {t("dashboard.addRestaurant")}
            </Button>
          </div>
          <div className="hidden shrink-0 lg:flex">
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Sparkles className="h-12 w-12 text-primary/80" />
            </div>
          </div>
        </div>
      </div>

      {listPhase === "success" && restaurants && restaurants.length > 0 ? (
        <div className={SEMANTIC_KPI_GRID.quad}>
          <DashboardStatCard
            label={t("dashboard.title")}
            value={restaurants.length}
            icon={Store}
            tone="info"
          />
          <DashboardStatCard
            label={t("dashboard.active")}
            value={activeCount}
            icon={CheckCircle2}
            tone="success"
          />
          <DashboardStatCard
            label={t("dashboard.visit")}
            value={totalViews}
            icon={Eye}
            tone="warning"
          />
          <DashboardStatCard
            label={language === "ar" ? "جاهز للإدارة" : "Ready to manage"}
            value={restaurants.length}
            icon={LayoutGrid}
            tone="accent"
            hint={language === "ar" ? "افتح مطعماً للبدء" : "Open a restaurant to start"}
          />
        </div>
      ) : null}

      {listPhase === "loading" ? (
        <AppLoadingState label={t("uiState.loading")} />
      ) : listPhase === "unauthorized" ? (
        <AppUnauthorizedState
          title={t("uiState.unauthorizedTitle")}
          description={t("dashboard.pleaseLogin")}
          loginLabel={t("common.login")}
          onLogin={() => spaNavigate(getLoginUrl())}
        />
      ) : listPhase === "forbidden" ? (
        <AppForbiddenState
          title={t("uiState.forbiddenTitle")}
          description={formatUserFacingQueryError(restaurantsQueryError, t)}
        />
      ) : listPhase === "error" ? (
        <AppErrorState
          title={userFacingErrorTitle(restaurantsQueryError, t)}
          description={formatUserFacingQueryError(restaurantsQueryError, t)}
          retryLabel={t("uiState.retry")}
          onRetry={() => {
            void refetch();
          }}
          isRetrying={restaurantsFetching}
        />
      ) : listPhase === "empty" ? (
        <AppEmptyState
          title={t("dashboard.noRestaurants")}
          description={t("dashboard.noRestaurantsDesc")}
          icon={Store}
          action={
            <AppEmptyStateActionButton onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              {t("dashboard.addNewRestaurant")}
            </AppEmptyStateActionButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {(restaurants ?? []).map((r) => (
            <Card
              key={r.id}
              className={cn(dash.cardHover, "cursor-pointer group")}
              onClick={() => onSelect(r.id)}
            >
              <CardContent className="p-6 sm:p-7">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {resolveImageUrl(r.logoUrl) ? (
                      <img src={resolveImageUrl(r.logoUrl)} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-foreground">{r.nameAr}</h3>
                      {r.nameEn && <p className="text-xs text-muted-foreground">{r.nameEn}</p>}
                    </div>
                  </div>
                  <Badge variant={r.isActive ? "default" : "secondary"} className={r.isActive ? "bg-primary/20 text-primary border-0" : ""}>
                    {r.isActive ? t('dashboard.active') : t('dashboard.disabled')}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {r.viewCount} {t('dashboard.visit')}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition">
                    <span>{t('dashboard.manageMenu')}</span>
                    <ArrowRight className="w-4 h-4 mr-1" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteRestaurantId(r.id);
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRestaurantDialog open={showCreate} onClose={() => setShowCreate(false)} />
      
      <SemanticConfirmDialog
        open={deleteRestaurantId !== null}
        onOpenChange={(open) => !open && setDeleteRestaurantId(null)}
        kind="destructive"
        icon="delete"
        title={t("dashboard.deleteRestaurant")}
        description={t("dashboard.deleteRestaurantConfirm")}
        cancelLabel={t("common.cancel")}
        confirmLabel={
          deleteRestaurantMutation.isPending
            ? t("common.deleting")
            : t("common.delete")
        }
        onConfirm={handleDeleteRestaurant}
        loading={deleteRestaurantMutation.isPending}
        loadingLabel={t("common.deleting")}
      />
    </div>
  );
}

// ─── Create Restaurant Dialog ───────────────────────────────

function CreateRestaurantDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, language } = useLanguage();
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
   const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [showCurrencyChoice, setShowCurrencyChoice] = useState(false);
  const [localCurrencyCode, setLocalCurrencyCode] = useState("");
  const [localCurrencySymbol, setLocalCurrencySymbol] = useState("");
  const [localCurrencyNameAr, setLocalCurrencyNameAr] = useState("");
  const [localCurrencyNameEn, setLocalCurrencyNameEn] = useState("");
  const { data: countries } = trpc.countryCurrency.getAll.useQuery();
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const country = countries?.find(c => c.countryCode === countryCode);
    if (country) {
      setLocalCurrencyCode(country.currencyCode);
      setLocalCurrencySymbol(country.currencySymbol);
      setLocalCurrencyNameAr(country.currencyNameAr || '');
      setLocalCurrencyNameEn(country.currencyNameEn || '');
      if (country.currencyCode === 'USD') {
        setSelectedCurrency('USD');
        setCurrencySymbol('$');
        setShowCurrencyChoice(false);
      } else {
        setShowCurrencyChoice(true);
        setSelectedCurrency(country.currencyCode);
        setCurrencySymbol(country.currencySymbol);
      }
    }
  };
  const handleCurrencySelect = (type: 'local' | 'usd') => {
    if (type === 'usd') {
      setSelectedCurrency('USD');
      setCurrencySymbol('$');
    } else {
      setSelectedCurrency(localCurrencyCode);
      setCurrencySymbol(localCurrencySymbol);
    }
  };

  const utils = trpc.useUtils();
  const createMutation = trpc.restaurant.create.useMutation({
    onSuccess: () => {
      utils.restaurant.list.invalidate();
      toast.success(t('dashboard.createRestaurantSuccess'));
      resetForm();
      onClose();
    },
    onError: (err) => toastTrpcError(err, t),
  });

  const resetForm = () => {
    setNameAr(""); setNameEn(""); setDescriptionAr(""); setPhone(""); setAddress("");
    setSelectedCountry(""); setSelectedCurrency(""); setCurrencySymbol("");
    setShowCurrencyChoice(false); setLocalCurrencyCode(""); setLocalCurrencySymbol("");
    setLocalCurrencyNameAr(""); setLocalCurrencyNameEn("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-card border-border max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t('dashboard.addNewRestaurant')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{t('dashboard.addRestaurantDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-foreground">{t('dashboard.restaurantNameAr')}</Label>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t('dashboard.exampleRestaurant')} className="mt-1 bg-input border-border text-foreground" />
          </div>
          <div>
            <Label className="text-foreground">{t('dashboard.restaurantNameEn')}</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Al Sharq Restaurant" className="mt-1 bg-input border-border text-foreground" dir="ltr" />
          </div>
          <div>
            <Label className="text-foreground">{t('dashboard.description')}</Label>
            <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} placeholder={t('dashboard.exampleDescription')} className="mt-1 bg-input border-border text-foreground" rows={3} />
          </div>
          <div>
            <Label className="text-foreground">{t('dashboard.country')}</Label>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-foreground"
            >
              <option value="">{t('dashboard.selectCountry')}</option>
              {countries?.map((c) => (
                <option key={c.countryCode} value={c.countryCode}>
                  {language === 'ar' ? c.countryNameAr : c.countryNameEn}
                </option>
              ))}
            </select>
          </div>
          {selectedCountry && showCurrencyChoice && localCurrencyCode !== 'USD' && (
            <div className="space-y-2">
              <Label className="text-foreground">{t('dashboard.chooseCurrency')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleCurrencySelect('local')}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    selectedCurrency === localCurrencyCode
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border bg-input hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl font-bold block">{localCurrencySymbol}</span>
                  <span className="text-sm text-foreground font-medium">{localCurrencyCode}</span>
                  <span className="text-xs text-muted-foreground block">
                    {language === 'ar' ? localCurrencyNameAr : localCurrencyNameEn}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencySelect('usd')}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    selectedCurrency === 'USD'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border bg-input hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl font-bold block">$</span>
                  <span className="text-sm text-foreground font-medium">USD</span>
                  <span className="text-xs text-muted-foreground block">
                    {language === 'ar' ? 'دولار أمريكي' : 'US Dollar'}
                  </span>
                </button>
              </div>
            </div>
          )}
          {selectedCurrency && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold text-lg">{currencySymbol}</span>
                <span className="text-foreground">
                  {t('dashboard.currencyWillBe')}: <strong>{selectedCurrency}</strong>
                  {selectedCurrency === 'USD'
                    ? ` (${language === 'ar' ? 'دولار أمريكي' : 'US Dollar'})`
                    : ` (${language === 'ar' ? localCurrencyNameAr || countries?.find(c => c.countryCode === selectedCountry)?.currencyNameAr : localCurrencyNameEn || countries?.find(c => c.countryCode === selectedCountry)?.currencyNameEn})`
                  }
                </span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground">{t('dashboard.phone')}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966..." className="mt-1 bg-input border-border text-foreground" dir="ltr" />
            </div>
            <div>
              <Label className="text-foreground">{t('dashboard.address')}</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('dashboard.example')} className="mt-1 bg-input border-border text-foreground" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border text-foreground">{t('dashboard.cancel')}</Button>
          <Button
            onClick={() => createMutation.mutate({ nameAr, nameEn: nameEn || undefined, descriptionAr: descriptionAr || undefined, phone: phone || undefined, address: address || undefined, countryCode: selectedCountry || undefined, currencyCode: selectedCurrency || undefined, currencySymbol: currencySymbol || undefined })}
            disabled={!nameAr.trim() || createMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('dashboard.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Restaurant detail sections ─────────────────────────────

function RestaurantHeaderCard({ restaurant }: { restaurant: any }) {
  const { language } = useLanguage();
  const menuUrl =
    restaurant?.slug && typeof window !== "undefined"
      ? `${window.location.origin}/menu/${restaurant.slug}`
      : null;

  const handlePreview = () => {
    if (menuUrl) window.open(menuUrl, "_blank", "noopener,noreferrer");
  };

  const handleShare = () => {
    if (!menuUrl) return;
    void navigator.clipboard.writeText(menuUrl).then(() => {
      toast.success(language === "ar" ? "تم نسخ رابط المنيو" : "Menu link copied");
    });
  };

  return (
    <div className={cn(dash.hero)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {restaurant.nameAr}
            </h1>
            {restaurant.nameEn ? (
              <p className="mt-1 text-sm text-slate-400">{restaurant.nameEn}</p>
            ) : null}
          </div>
          <p className="hidden max-w-xl text-sm leading-relaxed text-slate-400 sm:block">
            {restaurant.descriptionAr ||
              (language === "ar"
                ? "أدر منيوك الرقمي والطلبات والتقارير من مكان واحد."
                : "Manage your digital menu, orders, and reports in one place.")}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              className="bg-green-600 text-white shadow-sm hover:bg-green-600/90"
              onClick={handlePreview}
              disabled={!menuUrl}
            >
              <Eye className="h-4 w-4" />
              {language === "ar" ? "معاينة المنيو" : "Preview Menu"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={restaurantDash.toolbarBtn}
              onClick={handleShare}
              disabled={!menuUrl}
            >
              <Copy className="h-4 w-4" />
              {language === "ar" ? "مشاركة المنيو" : "Share Menu"}
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-center sm:justify-end">
          {resolveImageUrl(restaurant.logoUrl) ? (
            <img
              src={resolveImageUrl(restaurant.logoUrl)}
              alt=""
              className="h-16 w-16 rounded-xl border border-slate-700/50 object-cover shadow-md sm:h-20 sm:w-20"
            />
          ) : restaurant.slug ? (
            <div className="rounded-xl border border-slate-700/50 bg-white p-2 shadow-md">
              <QRCodeSVG value={menuUrl || ""} size={80} level="M" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/60 sm:h-20 sm:w-20">
              <Store className="h-8 w-8 text-slate-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RestaurantHomePanel({
  restaurant,
  language,
  restaurantId,
  currencySymbol,
  tableLabel,
  onTabChange,
}: {
  restaurant: { nameAr: string; slug?: string | null };
  language: string;
  restaurantId: number;
  currencySymbol?: string;
  tableLabel?: string;
  onTabChange: (tab: RestaurantTab) => void;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const ordersEnabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const [workspaceSessionId, setWorkspaceSessionId] = useState<number | null>(null);

  return (
    <div className={dash.stack}>
      <RestaurantHeaderCard restaurant={restaurant} />
      <OperationalSnapshotSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={ordersEnabled}
        currencySymbol={currencySymbol}
      />
      <ActionCenterSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={ordersEnabled}
        onOpenSession={setWorkspaceSessionId}
      />
      <ActiveSessionsPreviewSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={ordersEnabled}
        currencySymbol={currencySymbol}
        onOpenSession={setWorkspaceSessionId}
        onViewAllSessions={() => onTabChange("sessions")}
        previewLimit={6}
      />
      <OperationalActivityFeedSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={ordersEnabled}
        onOpenSession={setWorkspaceSessionId}
      />

      <DiningSessionWorkspaceSheet
        open={workspaceSessionId != null}
        onOpenChange={(open) => {
          if (!open) setWorkspaceSessionId(null);
        }}
        restaurantId={restaurantId}
        sessionId={workspaceSessionId}
        currencySymbol={currencySymbol}
        tableLabel={tableLabel}
      />
    </div>
  );
}

function RestaurantDetail({
  restaurantId,
  onBack,
  activeTab,
  onTabChange,
}: {
  restaurantId: number;
  onBack: () => void;
  activeTab: RestaurantTab;
  onTabChange: (tab: RestaurantTab) => void;
}) {
  const { t, language } = useLanguage();
  const { isAuthenticated, authPending } = useAuth();
  const queriesEnabled = restaurantQueriesEnabled(
    authPending,
    isAuthenticated,
    restaurantId
  );
  const loadCategories = activeTab === "categories";

  const {
    data: restaurant,
    isPending: restaurantPending,
    isError: restaurantError,
    error: restaurantQueryError,
    isFetching: restaurantFetching,
    refetch: refetchRestaurant,
  } = trpc.restaurant.getById.useQuery(
    { id: restaurantId },
    { enabled: queriesEnabled }
  );
  const { data: categoriesList, isLoading: catsLoading } = trpc.category.list.useQuery(
    { restaurantId },
    { enabled: queriesEnabled && loadCategories }
  );
  const {
    subscriptionExpiryWarning: subscriptionWarning,
    hasFeature,
    entitlements,
    isReady: entitlementsReady,
  } = useCommercialFeatureVisibility();
  const canManageScreens = hasFeature("devices");
  const canManageSessions = hasFeature("sessionTableManagement");
  const canManageMenu = hasFeature("menuManagement");
  const canManageDesign = hasFeature("menuDesign");
  const canManageQr = hasFeature("smartQr");
  const uiLanguage = language === "ar" ? "ar" : "en";
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const detailPhase = resolveAsyncUiState({
    authPending,
    isAuthenticated,
    queryPending: restaurantPending,
    isError: restaurantError,
    error: restaurantQueryError,
    isSuccess:
      !restaurantError && !restaurantPending && restaurant !== undefined,
    isEmpty:
      !restaurantError && !restaurantPending && restaurant === null,
  });

  const cashierGate = (node: ReactElement) =>
    activeTab === "cashier" ? (
      <CashierRouteFallback restaurantId={restaurantId} language={uiLanguage}>
        {node}
      </CashierRouteFallback>
    ) : (
      node
    );

  if (detailPhase === "loading") {
    return cashierGate(<AppLoadingState label={t("uiState.loading")} />);
  }
  if (detailPhase === "unauthorized") {
    return cashierGate(
      <AppUnauthorizedState
        title={t("uiState.unauthorizedTitle")}
        description={t("dashboard.pleaseLogin")}
        loginLabel={t("common.login")}
        onLogin={() => spaNavigate(getLoginUrl())}
      />
    );
  }
  if (detailPhase === "forbidden") {
    return cashierGate(
      <AppForbiddenState
        title={t("uiState.forbiddenTitle")}
        description={formatUserFacingQueryError(restaurantQueryError, t)}
      />
    );
  }
  if (detailPhase === "error") {
    return cashierGate(
      <AppErrorState
        title={userFacingErrorTitle(restaurantQueryError, t)}
        description={formatUserFacingQueryError(restaurantQueryError, t)}
        retryLabel={t("uiState.retry")}
        onRetry={() => {
          void refetchRestaurant();
        }}
        isRetrying={restaurantFetching}
      />
    );
  }
  if (detailPhase === "empty" || !restaurant) {
    return cashierGate(<AppEmptyState title={t("dashboard.restaurantNotFound")} />);
  }

  const statsAriaLabel = language === "ar" ? "نظرة عامة" : "Overview";

  if (activeTab === "cashier") {
    const restaurantName =
      language === "ar"
        ? restaurant?.nameAr
        : restaurant?.nameEn || restaurant?.nameAr;
    return (
      <CashierWorkspacePanel
        restaurantId={restaurantId}
        language={language === "ar" ? "ar" : "en"}
        restaurantName={restaurantName ?? null}
        currencySymbol={
          (restaurant as { currencySymbol?: string | null })?.currencySymbol ?? null
        }
        taxEnabled={(restaurant as { taxEnabled?: boolean | null }).taxEnabled}
        taxMode={(restaurant as { taxMode?: string | null }).taxMode}
        taxPolicyJson={(restaurant as { taxPolicyJson?: string | null }).taxPolicyJson}
      />
    );
  }

  return (
    <div className={dash.stack}>
      <OwnerAccessControl />
      {subscriptionWarning && (
        <div
          className={cn(
            "flex items-center gap-4 rounded-2xl border p-5 sm:p-6",
            subscriptionWarning.type === "expired"
              ? "border-red-500/30 bg-red-500/10 text-red-400"
              : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
          )}
        >
          <Clock className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {subscriptionWarning.type === 'expired'
                ? t('dashboard.subscriptionExpired')
                : t('dashboard.subscriptionExpiringSoon').replace('{days}', subscriptionWarning.daysLeft.toString())
              }
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              {t('dashboard.renewToKeepAccess')}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className={subscriptionWarning.type === 'expired'
              ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
              : 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10'
            }
            onClick={() => window.location.href = '/subscription'}
          >
            {t('dashboard.renewNow')}
          </Button>
        </div>
      )}

      {activeTab === "home" && (
        <RestaurantHomePanel
          restaurant={restaurant}
          language={language}
          restaurantId={restaurantId}
          currencySymbol={(restaurant as { currencySymbol?: string })?.currencySymbol}
          tableLabel={(restaurant as { tableLabel?: string })?.tableLabel}
          onTabChange={onTabChange}
        />
      )}

      {activeTab === "sessions" &&
        (entitlementsReady && !canManageSessions ? (
          <CommercialUpgradeBanner
            entitlements={entitlements}
            featureKey="sessionTableManagement"
            language={uiLanguage}
          />
        ) : (
        <SessionsWorkspacePanel
          restaurantId={restaurantId}
          language={language}
          currencySymbol={(restaurant as { currencySymbol?: string })?.currencySymbol}
          tableLabel={(restaurant as { tableLabel?: string })?.tableLabel}
          workingHoursRaw={(restaurant as { workingHours?: string | null })?.workingHours}
        />
        ))}

      {activeTab === "orders" && (
        <OrdersWorkspacePanel
          restaurantId={restaurantId}
          language={language}
          currencySymbol={(restaurant as { currencySymbol?: string })?.currencySymbol}
          tableLabel={(restaurant as { tableLabel?: string })?.tableLabel}
        />
      )}

      {activeTab === "settlements" && (
        <SettlementHistoryPanel
          restaurantId={restaurantId}
          language={language === "ar" ? "ar" : "en"}
          restaurantName={
            language === "ar"
              ? (restaurant as { nameAr?: string })?.nameAr
              : (restaurant as { nameEn?: string })?.nameEn ||
                (restaurant as { nameAr?: string })?.nameAr
          }
          currencySymbol={(restaurant as { currencySymbol?: string })?.currencySymbol}
        />
      )}

      {activeTab === "register" && (
        <RegisterOperationsPanel
          restaurantId={restaurantId}
          language={language === "ar" ? "ar" : "en"}
          currencyCode={(restaurant as { currencyCode?: string })?.currencyCode}
          currencySymbol={
            (restaurant as { currencySymbol?: string })?.currencySymbol
          }
          restaurantName={
            language === "ar"
              ? (restaurant as { nameAr?: string })?.nameAr ||
                (restaurant as { nameEn?: string })?.nameEn ||
                ""
              : (restaurant as { nameEn?: string })?.nameEn ||
                (restaurant as { nameAr?: string })?.nameAr ||
                ""
          }
        />
      )}

      {activeTab === "register-catalog" && (
        <RegisterCatalogPanel
          restaurantId={restaurantId}
          language={language === "ar" ? "ar" : "en"}
          openCreate={
            typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("create") === "1"
          }
          canManageCatalog
        />
      )}

      {(activeTab === "screens" || activeTab === "devices") &&
        (entitlementsReady && !canManageScreens ? (
          <CommercialUpgradeBanner
            entitlements={entitlements}
            featureKey="devices"
            language={uiLanguage}
          />
        ) : (
          <ScreenManagementWorkspacePanel restaurantId={restaurantId} language={language} />
        ))}

      {activeTab === "screen-provisioning" &&
        (entitlementsReady && !canManageScreens ? (
          <CommercialUpgradeBanner
            entitlements={entitlements}
            featureKey="devices"
            language={uiLanguage}
          />
        ) : (
          <ProvisioningWorkspacePanel restaurantId={restaurantId} language={language} />
        ))}

      {activeTab === "print" && (
        <PrintWorkspacePanel
          restaurantId={restaurantId}
          language={language}
          currencySymbol={(restaurant as { currencySymbol?: string })?.currencySymbol}
          onOpenPrinterManagement={() => onTabChange("printer-management")}
        />
      )}

      {activeTab === "printer-management" && (
        <PrinterManagementPanel
          restaurantId={restaurantId}
          language={language}
          onOpenPrintSetup={() => onTabChange("print")}
        />
      )}

      {activeTab === "reports" && (
        <ReportsTab
          restaurantId={restaurantId}
          restaurantName={
            language === "ar"
              ? (restaurant as { nameAr?: string })?.nameAr
              : (restaurant as { nameEn?: string })?.nameEn ||
                (restaurant as { nameAr?: string })?.nameAr
          }
          logoUrl={(restaurant as { logoUrl?: string | null })?.logoUrl}
          currencySymbol={(restaurant as { currencySymbol?: string })?.currencySymbol}
          currencyCode={(restaurant as { currencyCode?: string })?.currencyCode}
          t={t}
          language={language}
          statsAriaLabel={statsAriaLabel}
          workingHoursRaw={(restaurant as { workingHours?: string | null })?.workingHours}
        />
      )}

      {activeTab === "categories" &&
        (entitlementsReady && !canManageMenu ? (
          <CommercialUpgradeBanner
            entitlements={entitlements}
            featureKey="menuManagement"
            language={uiLanguage}
          />
        ) : (
        <CategoriesTab
          restaurantId={restaurantId}
          categories={categoriesList || []}
          isLoading={catsLoading}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          currencySymbol={(restaurant as { currencySymbol?: string })?.currencySymbol}
        />
        ))}

      {activeTab === "offers" &&
        (entitlementsReady && !canManageMenu ? (
          <CommercialUpgradeBanner
            entitlements={entitlements}
            featureKey="menuManagement"
            language={uiLanguage}
          />
        ) : (
        <OffersTab restaurantId={restaurantId} currencySymbol={(restaurant as { currencySymbol?: string })?.currencySymbol} />
        ))}

      {activeTab === "tables" &&
        (entitlementsReady && !canManageQr ? (
          <CommercialUpgradeBanner
            entitlements={entitlements}
            featureKey="smartQr"
            language={uiLanguage}
          />
        ) : (
        <TablesTab restaurantId={restaurantId} restaurant={restaurant} />
        ))}

      {activeTab === "qr" &&
        (entitlementsReady && !canManageQr ? (
          <CommercialUpgradeBanner
            entitlements={entitlements}
            featureKey="smartQr"
            language={uiLanguage}
          />
        ) : (
        <QRTab restaurant={restaurant} />
        ))}

      {activeTab === "templates" &&
        (entitlementsReady && !canManageDesign ? (
          <CommercialUpgradeBanner
            entitlements={entitlements}
            featureKey="menuDesign"
            language={uiLanguage}
          />
        ) : (
        <div className="py-10 text-center sm:py-14">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/45 bg-muted/20">
            <Palette className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground sm:text-xl">{t("dashboard.templateDesign")}</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("dashboard.chooseTemplate")}
          </p>
          <a href={`/dashboard/templates/${restaurantId}`} className="mt-8 inline-block">
            <Button className="shadow-sm">
              <Palette className="h-4 w-4" />
              {t("dashboard.selectTemplateBtn")}
            </Button>
          </a>
        </div>
        ))}

      {activeTab === "settings" && <SettingsTab restaurant={restaurant} onBack={onBack} />}
    </div>
  );
}

// ─── Categories Tab ─────────────────────────────────────────

function CategoriesTab({
  restaurantId,
  categories,
  isLoading,
  selectedCategoryId,
  onSelectCategory,
  currencySymbol,
}: {
  restaurantId: number;
  categories: any[];
  isLoading: boolean;
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  currencySymbol?: string;
}) {
  const { t } = useLanguage();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const deleteCatMutation = trpc.category.delete.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      utils.restaurant.stats.invalidate();
      toast.success(t('dashboard.deleteCategorySuccess'));
      setDeleteCatId(null);
      if (selectedCategoryId === deleteCatId) onSelectCategory(null);
    },
    onError: (err) => toastTrpcError(err, t),
  });

  if (selectedCategoryId) {
    return (
      <ItemsView
        categoryId={selectedCategoryId}
        restaurantId={restaurantId}
        onBack={() => onSelectCategory(null)}
        categoryName={categories.find((c) => c.id === selectedCategoryId)?.nameAr || ""}
        currencySymbol={currencySymbol}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">{t('dashboard.categories')}</h2>
        <Button size="sm" onClick={() => setShowAddCategory(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 ml-1" />
          {t('dashboard.addCategory')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !categories.length ? (
        <Card className={dash.card}>
          <CardContent className="p-8 text-center">
            <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground mb-4">{t('dashboard.noCategories')}</p>
            <Button size="sm" onClick={() => setShowAddCategory(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 ml-1" />
              {t('dashboard.addCategory')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className={cn(dash.card, "cursor-pointer group")}
              onClick={() => onSelectCategory(cat.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{cat.nameAr}</h3>
                    {cat.nameEn && <p className="text-xs text-muted-foreground">{cat.nameEn}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setEditCat(cat); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setDeleteCatId(cat.id); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CategoryFormDialog
        open={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        restaurantId={restaurantId}
      />

      {editCat && (
        <CategoryFormDialog
          open={!!editCat}
          onClose={() => setEditCat(null)}
          restaurantId={restaurantId}
          category={editCat}
        />
      )}

      <SemanticConfirmDialog
        open={!!deleteCatId}
        onOpenChange={(v) => {
          if (!v) setDeleteCatId(null);
        }}
        kind="destructive"
        icon="delete"
        title={t("dashboard.deleteCategory")}
        description={t("dashboard.deleteCategoryConfirm")}
        cancelLabel={t("dashboard.cancel")}
        confirmLabel={t("dashboard.delete")}
        onConfirm={() => deleteCatId && deleteCatMutation.mutate({ id: deleteCatId })}
        loading={deleteCatMutation.isPending}
      />
    </div>
  );
}

// ─── Category Form Dialog ───────────────────────────────────

function CategoryFormDialog({
  open, onClose, restaurantId, category,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: number;
  category?: any;
}) {
  const { t } = useLanguage();
  const [nameAr, setNameAr] = useState(category?.nameAr || "");
  const [nameEn, setNameEn] = useState(category?.nameEn || "");
  const [descriptionAr, setDescriptionAr] = useState(category?.descriptionAr || "");
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);

  const utils = trpc.useUtils();

  const createMutation = trpc.category.create.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      utils.restaurant.stats.invalidate();
      toast.success(t('dashboard.addCategorySuccess'));
      onClose();
    },
    onError: (err) => toastTrpcError(err, t),
  });

  const updateMutation = trpc.category.update.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      toast.success(t('dashboard.updateCategorySuccess'));
      onClose();
    },
    onError: (err) => toastTrpcError(err, t),
  });

  const handleSubmit = () => {
    if (category) {
      updateMutation.mutate({ id: category.id, nameAr, nameEn: nameEn || undefined, descriptionAr: descriptionAr || undefined, sortOrder });
    } else {
      createMutation.mutate({ restaurantId, nameAr, nameEn: nameEn || undefined, descriptionAr: descriptionAr || undefined, sortOrder });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-card border-border max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{category ? t('dashboard.editCategory') : t('dashboard.addNewCategory')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {category ? t('dashboard.editCategoryData') : t('dashboard.addCategoryDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-foreground">{t('dashboard.categoryNameAr')}</Label>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t('dashboard.exampleCategory')} className="mt-1 bg-input border-border text-foreground" />
          </div>
          <div>
            <Label className="text-foreground">{t('dashboard.categoryNameEn')}</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Appetizers" className="mt-1 bg-input border-border text-foreground" dir="ltr" />
          </div>
          <div>
            <Label className="text-foreground">{t('dashboard.description')}</Label>
            <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} placeholder={t('dashboard.exampleDescription')} className="mt-1 bg-input border-border text-foreground" rows={2} />
          </div>
          <div>
            <Label className="text-foreground">{t('dashboard.sortOrder')}</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="mt-1 bg-input border-border text-foreground w-24" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border text-foreground">{t('dashboard.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!nameAr.trim() || isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : category ? t('dashboard.save') : t('dashboard.addCategory')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Items View ─────────────────────────────────────────────

function ItemsView({
  categoryId, restaurantId, onBack, categoryName, currencySymbol,
}: {
  categoryId: number;
  restaurantId: number;
  onBack: () => void;
  categoryName: string;
  currencySymbol?: string;
}) {
  const { t } = useLanguage();
  const { isAuthenticated, authPending } = useAuth();
  const queriesEnabled =
    restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId) && categoryId > 0;
  const { data: items, isLoading } = trpc.menuItem.listByCategory.useQuery(
    { categoryId },
    { enabled: queriesEnabled }
  );
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const deleteItemMutation = trpc.menuItem.delete.useMutation({
    onSuccess: () => {
      utils.menuItem.listByCategory.invalidate();
      utils.restaurant.stats.invalidate();
      toast.success(t('dashboard.successDeleted'));
      setDeleteItemId(null);
    },
    onError: (err) => toastTrpcError(err, t),
  });

  const toggleAvailability = trpc.menuItem.update.useMutation({
    onSuccess: () => {
      utils.menuItem.listByCategory.invalidate();
      toast.success(t('dashboard.statusUpdated'));
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-foreground">{t('dashboard.items')}: {categoryName}</h2>
        </div>
        <Button size="sm" onClick={() => setShowAddItem(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 ml-1" />
          {t('dashboard.addItem')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !items?.length ? (
        <Card className={dash.card}>
          <CardContent className="p-8 text-center">
            <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground mb-4">{t('dashboard.noItems')}</p>
            <Button size="sm" onClick={() => setShowAddItem(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 ml-1" />
              {t('dashboard.addItem')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const itemImageSrc = resolveImageUrl(item.imageUrl);
            return (
            <Card key={item.id} className={dash.card}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {itemImageSrc ? (
                    <img src={itemImageSrc} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.nameAr}</h3>
                        {item.nameEn && <p className="text-xs text-muted-foreground">{item.nameEn}</p>}
                        {(item as any).calories && <p className="text-xs text-muted-foreground mt-0.5">🔥 {(item as any).calories} {t('dashboard.calorie')}</p>}
                      </div>
                      <span className="text-lg font-bold text-accent shrink-0">{item.price} {currencySymbol || t('dashboard.sar')}</span>
                    </div>
                    {item.descriptionAr && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.descriptionAr}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={(checked) => toggleAvailability.mutate({ id: item.id, isAvailable: checked })}
                        />
                        <span className={`text-xs ${item.isAvailable ? "text-primary" : "text-muted-foreground"}`}>
                          {item.isAvailable ? t('dashboard.available') : t('dashboard.unavailable')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditItem(item)} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteItemId(item.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      <ItemFormDialog
        open={showAddItem}
        onClose={() => setShowAddItem(false)}
        categoryId={categoryId}
        restaurantId={restaurantId}
      />

      {editItem && (
        <ItemFormDialog
          open={!!editItem}
          onClose={() => setEditItem(null)}
          categoryId={categoryId}
          restaurantId={restaurantId}
          item={editItem}
        />
      )}

      <SemanticConfirmDialog
        open={!!deleteItemId}
        onOpenChange={(v) => {
          if (!v) setDeleteItemId(null);
        }}
        kind="destructive"
        icon="delete"
        title={t("dashboard.deleteItem")}
        description={t("dashboard.deleteItemConfirm")}
        cancelLabel={t("dashboard.cancel")}
        confirmLabel={t("dashboard.delete")}
        onConfirm={() => deleteItemId && deleteItemMutation.mutate({ id: deleteItemId })}
        loading={deleteItemMutation.isPending}
      />
    </div>
  );
}

// ─── Item Form Dialog ───────────────────────────────────────

function ItemFormDialog({
  open, onClose, categoryId, restaurantId, item,
}: {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  restaurantId: number;
  item?: any;
}) {
  const { t } = useLanguage();
  const [nameAr, setNameAr] = useState(item?.nameAr || "");
  const [nameEn, setNameEn] = useState(item?.nameEn || "");
  const [descriptionAr, setDescriptionAr] = useState(item?.descriptionAr || "");
  const [descriptionEn, setDescriptionEn] = useState(item?.descriptionEn || "");
  const [price, setPrice] = useState(item?.price || "");
  const [calories, setCalories] = useState(item?.calories || "");
  const [sortOrder, setSortOrder] = useState(item?.sortOrder ?? 0);
  const [imagePreview, setImagePreview] = useState<string | null>(
    resolveImageUrl(item?.imageUrl) || null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  useEffect(() => {
    if (!open) return;
    setImagePreview(resolveImageUrl(item?.imageUrl) || null);
    setImageFile(null);
  }, [open, item?.id, item?.imageUrl]);

  const createMutation = trpc.menuItem.create.useMutation();
  const updateMutation = trpc.menuItem.update.useMutation();
  const uploadImageMutation = trpc.menuItem.uploadImage.useMutation();

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

  const uploadImageForItem = async (itemId: number, file: File) => {
    const imageData = await readFileAsBase64(file);
    const { url } = await uploadImageMutation.mutateAsync({
      itemId,
      imageData,
      fileName: file.name,
      contentType: file.type,
    });
    setImagePreview(resolveImageUrl(url) || url);
    return url;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSubmit = async () => {
    try {
      if (item) {
        if (imageFile) {
          await uploadImageForItem(item.id, imageFile);
        }
        await updateMutation.mutateAsync({
          id: item.id,
          nameAr,
          nameEn: nameEn || undefined,
          descriptionAr: descriptionAr || undefined,
          descriptionEn: descriptionEn || undefined,
          price,
          calories: calories ? Number(calories) : undefined,
        });
        toast.success(t('dashboard.successUpdated'));
      } else {
        const data = await createMutation.mutateAsync({
          categoryId,
          restaurantId,
          nameAr,
          nameEn: nameEn || undefined,
          descriptionAr: descriptionAr || undefined,
          descriptionEn: descriptionEn || undefined,
          price,
          calories: calories ? Number(calories) : undefined,
        });
        if (imageFile && data.id) {
          await uploadImageForItem(data.id, imageFile);
        }
        toast.success(t('dashboard.successAdded'));
      }
      await utils.menuItem.listByCategory.invalidate();
      utils.restaurant.stats.invalidate();
      onClose();
    } catch (err: unknown) {
      toastTrpcError(err, t);
    }
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadImageMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-card border-border max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{item ? t('dashboard.editItem') : t('dashboard.addNewItem')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {item ? t('dashboard.editItemData') : t('dashboard.addItemDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Image Upload */}
          <div>
            <Label className="text-foreground">{t('dashboard.itemImage')}</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition"
            >
              {imagePreview ? (
                <img src={resolveImageUrl(imagePreview) ?? imagePreview} alt="" className="w-32 h-32 rounded-lg object-cover mx-auto" />
              ) : (
                <div className="py-4">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('dashboard.clickToUpload')}</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground">{t('dashboard.nameAr')}</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t('dashboard.exampleItem')} className="mt-1 bg-input border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground">{t('dashboard.nameEn')}</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Classic Burger" className="mt-1 bg-input border-border text-foreground" dir="ltr" />
            </div>
          </div>

          <div>
            <Label className="text-foreground">{t('dashboard.descriptionAr2')}</Label>
            <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} placeholder={t('dashboard.exampleDescription')} className="mt-1 bg-input border-border text-foreground" rows={2} />
          </div>

          <div>
            <Label className="text-foreground">{t('dashboard.descriptionEn')}</Label>
            <Textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder="Short description..." className="mt-1 bg-input border-border text-foreground" rows={2} dir="ltr" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-foreground">{t('dashboard.price')}</Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25.00" className="mt-1 bg-input border-border text-foreground" dir="ltr" />
            </div>
            <div>
              <Label className="text-foreground">{t('dashboard.calories')}</Label>
              <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="250" className="mt-1 bg-input border-border text-foreground" dir="ltr" />
            </div>
            <div>
              <Label className="text-foreground">{t('dashboard.sortOrder')}</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="mt-1 bg-input border-border text-foreground" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border text-foreground">{t('dashboard.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!nameAr.trim() || !price || isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : item ? t('dashboard.save') : t('dashboard.addItem')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── QR Tab ─────────────────────────────────────────────────

function QRTab({ restaurant }: { restaurant: any }) {
  const { t, language } = useLanguage();
  const menuUrl = `${window.location.origin}/menu/${restaurant.slug}`;
  const qrRef = useRef<HTMLDivElement>(null);
  const [fgColor, setFgColor] = useState("#0d3b4f");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [qrSize, setQrSize] = useState(256);
  const [activePreset, setActivePreset] = useState(1);
  const [showCustomColors, setShowCustomColors] = useState(false);
  const [showLogoInQR, setShowLogoInQR] = useState(true);
  const [logoScale, setLogoScale] = useState(0.42);
  const [logoBorderRadius, setLogoBorderRadius] = useState(8);
  const [logoBorderWidth, setLogoBorderWidth] = useState(3);
  const [logoBorderColor, setLogoBorderColor] = useState("#0d3b4f");
  const [logoBackgroundColor, setLogoBackgroundColor] = useState("#ffffff");

  const QR_PRESETS = useMemo(() => [
    { name: t('dashboard.classic'), fg: "#000000", bg: "#ffffff" },
    { name: t('dashboard.dark'), fg: "#0d3b4f", bg: "#ffffff" },
    { name: t('dashboard.blue'), fg: "#1e40af", bg: "#dbeafe" },
    { name: t('dashboard.green'), fg: "#166534", bg: "#dcfce7" },
    { name: t('dashboard.red'), fg: "#991b1b", bg: "#fee2e2" },
    { name: t('dashboard.orange'), fg: "#9a3412", bg: "#ffedd5" },
    { name: t('dashboard.purple'), fg: "#6b21a8", bg: "#f3e8ff" },
    { name: t('dashboard.gold'), fg: "#854d0e", bg: "#fef9c3" },
  ], [t]);

  const QR_SIZES = useMemo(() => [
    { label: t('dashboard.small'), value: 180 },
    { label: t('dashboard.medium'), value: 256 },
    { label: t('dashboard.large'), value: 350 },
    { label: t('dashboard.extraLarge'), value: 450 },
  ], [t]);

  const downloadQR = (format: "png" | "svg") => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    if (format === "svg") {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${restaurant.slug}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        const exportSize = Math.max(qrSize * 4, 1024);
        canvas.width = exportSize;
        canvas.height = exportSize;
        if (ctx) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, exportSize, exportSize);
          ctx.drawImage(img, 0, 0, exportSize, exportSize);
          const pngUrl = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = pngUrl;
          a.download = `qr-${restaurant.slug}.png`;
          a.click();
        }
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    }
    toast.success(t('dashboard.qrDownloaded').replace('{format}', format.toUpperCase()));
  };

  const applyPreset = (index: number) => {
    setActivePreset(index);
    setFgColor(QR_PRESETS[index].fg);
    setBgColor(QR_PRESETS[index].bg);
    setShowCustomColors(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* QR Preview */}
      <Card className={dash.card}>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-bold text-foreground mb-2">{t('dashboard.qrCodeForMenu')}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {t('dashboard.scanQR')}
          </p>

          <div
            ref={qrRef}
            className="inline-block p-6 rounded-2xl mb-6 transition-all duration-300"
            style={{ backgroundColor: bgColor }}
          >
            <QRWithLogo
              value={menuUrl}
              size={qrSize}
              logoUrl={restaurant?.logoUrl}
              fgColor={fgColor}
              bgColor={bgColor}
              level="H"
              showLogo={showLogoInQR}
              logoScale={logoScale}
              logoBorderRadius={logoBorderRadius}
              logoBorderWidth={logoBorderWidth}
              logoBorderColor={logoBorderColor}
              logoBackgroundColor={logoBackgroundColor}
            />
          </div>

          <div className="bg-secondary/50 rounded-lg p-3 mb-6">
            <p className="text-xs text-muted-foreground mb-1">{t('dashboard.menuLink')}</p>
            <p className="text-sm text-foreground font-mono break-all" dir="ltr">{menuUrl}</p>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={() => downloadQR("png")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {t('dashboard.downloadPNG')}
            </Button>
            <Button onClick={() => downloadQR("svg")} variant="outline" className="border-border text-foreground">
              {t('dashboard.downloadSVG')}
            </Button>
            <Button
              variant="ghost"
              className="text-primary"
              onClick={() => {
                navigator.clipboard.writeText(menuUrl);
                toast.success(t('dashboard.copySuccess'));
              }}
            >
              {t('dashboard.copyLink')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Size */}
      <Card className={dash.card}>
        <CardContent className="p-6">
          <h4 className="text-md font-bold text-foreground mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {t('dashboard.qrSize')}
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {QR_SIZES.map((size) => (
              <button
                key={size.value}
                onClick={() => setQrSize(size.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  qrSize === size.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Presets */}
      <Card className={dash.card}>
        <CardContent className="p-6">
          <h4 className="text-md font-bold text-foreground mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            {t('dashboard.colorPresets')}
          </h4>

          {/* Preset Colors */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {QR_PRESETS.map((preset, index) => (
              <button
                key={index}
                onClick={() => applyPreset(index)}
                className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                  activePreset === index && !showCustomColors
                    ? "border-primary shadow-md scale-105"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <div
                    className="w-8 h-8 rounded-lg border border-border/50"
                    style={{ backgroundColor: preset.bg }}
                  >
                    <div
                      className="w-4 h-4 rounded m-1.5"
                      style={{ backgroundColor: preset.fg }}
                    />
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">{preset.name}</p>
                {activePreset === index && !showCustomColors && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom Colors Toggle */}
          <button
            onClick={() => setShowCustomColors(!showCustomColors)}
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 ${
              showCustomColors
                ? "border-primary bg-primary/10 text-primary"
                : "border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            <Palette className="w-4 h-4" />
            {showCustomColors ? t('dashboard.hideColors') : t('dashboard.customColors')}
          </button>

          {/* Custom Color Pickers */}
          {showCustomColors && (
            <div className="mt-4 p-4 bg-secondary/30 rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-foreground mb-2 block">{t('dashboard.fgColor')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => {
                        setFgColor(e.target.value);
                        setActivePreset(-1);
                      }}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                    />
                    <Input
                      value={fgColor}
                      onChange={(e) => {
                        setFgColor(e.target.value);
                        setActivePreset(-1);
                      }}
                      className="font-mono text-sm bg-background"
                      dir="ltr"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-foreground mb-2 block">{t('dashboard.bgColor')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => {
                        setBgColor(e.target.value);
                        setActivePreset(-1);
                      }}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                    />
                    <Input
                      value={bgColor}
                      onChange={(e) => {
                        setBgColor(e.target.value);
                        setActivePreset(-1);
                      }}
                      className="font-mono text-sm bg-background"
                      dir="ltr"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full border-border text-muted-foreground"
                onClick={() => applyPreset(1)}
              >
                {t('dashboard.resetToDefault')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logo Toggle */}
      {restaurant?.logoUrl && (
        <Card className={dash.card}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-md font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {t('dashboard.showLogoInQR') || 'عرض الشعار في الباركود'}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('dashboard.showLogoInQRDesc') || 'اختر ما إذا كنت تريد عرض شعار المطعم في منتصف الباركود'}
                </p>
              </div>
              <Switch
                checked={showLogoInQR}
                onCheckedChange={setShowLogoInQR}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logo Customization */}
      {restaurant?.logoUrl && showLogoInQR && (
        <Card className={dash.card}>
          <CardContent className="p-6">
            <h4 className="text-md font-bold text-foreground mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {language === 'ar' ? 'تخصيص الشعار' : 'Logo Customization'}
            </h4>
            <div className="space-y-4">
              {/* Logo Scale */}
              <div>
                <Label className="text-sm text-foreground mb-2 block">
                  {language === 'ar' ? 'حجم الشعار' : 'Logo Size'} ({(logoScale * 100).toFixed(0)}%)
                </Label>
                <input
                  type="range"
                  min="0.2"
                  max="0.6"
                  step="0.05"
                  value={logoScale}
                  onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Logo Border Width */}
              <div>
                <Label className="text-sm text-foreground mb-2 block">
                  {language === 'ar' ? 'سمك الحد' : 'Border Width'} ({logoBorderWidth}px)
                </Label>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  value={logoBorderWidth}
                  onChange={(e) => setLogoBorderWidth(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Logo Border Radius */}
              <div>
                <Label className="text-sm text-foreground mb-2 block">
                  {language === 'ar' ? 'استدارة الزوايا' : 'Border Radius'} ({logoBorderRadius}px)
                </Label>
                <input
                  type="range"
                  min="0"
                  max="16"
                  step="1"
                  value={logoBorderRadius}
                  onChange={(e) => setLogoBorderRadius(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Logo Border Color */}
              <div>
                <Label className="text-sm text-foreground mb-2 block">
                  {language === 'ar' ? 'لون الحد' : 'Border Color'}
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={logoBorderColor}
                    onChange={(e) => setLogoBorderColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                  />
                  <Input
                    value={logoBorderColor}
                    onChange={(e) => setLogoBorderColor(e.target.value)}
                    className="font-mono text-sm bg-background"
                    dir="ltr"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* Logo Background Color */}
              <div>
                <Label className="text-sm text-foreground mb-2 block">
                  {language === 'ar' ? 'لون الخلفية' : 'Background Color'}
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={logoBackgroundColor}
                    onChange={(e) => setLogoBackgroundColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                  />
                  <Input
                    value={logoBackgroundColor}
                    onChange={(e) => setLogoBackgroundColor(e.target.value)}
                    className="font-mono text-sm bg-background"
                    dir="ltr"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full border-border text-muted-foreground"
                onClick={() => {
                  setLogoScale(0.42);
                  setLogoBorderRadius(8);
                  setLogoBorderWidth(3);
                  setLogoBorderColor('#0d3b4f');
                  setLogoBackgroundColor('#ffffff');
                }}
              >
                {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Offers Tab ──────────────────────────────────────────────

function OffersTab({ restaurantId, currencySymbol }: { restaurantId: number; currencySymbol?: string }) {
  const { t, language } = useLanguage();
  const { isAuthenticated, authPending } = useAuth();
  const queriesEnabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const { data: offers, isLoading } = trpc.offer.list.useQuery(
    { restaurantId },
    { enabled: queriesEnabled }
  );
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const OFFER_TYPE_LABELS: Record<string, string> = {
    daily: t('dashboard.daily'),
    weekly: t('dashboard.weekly'),
    monthly: t('dashboard.monthly'),
  };

  const deleteMutation = trpc.offer.delete.useMutation({
    onSuccess: () => {
      utils.offer.list.invalidate({ restaurantId });
      toast.success(t('dashboard.deleteOfferSuccess'));
      setDeleteId(null);
    },
    onError: () => toast.error(t('dashboard.deleteOfferError')),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t('dashboard.offersSpecial')}</h2>
          <p className="text-sm text-muted-foreground">{t('dashboard.offersDescription')}</p>
        </div>
        <Button onClick={() => { setEditingOffer(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('dashboard.addOffer')}
        </Button>
      </div>

      {(!offers || offers.length === 0) ? (
        <div className={cn(dash.emptyPanel, "text-center")}>
          <Tag className="w-16 h-16 text-primary/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('dashboard.noOffersYet')}</h3>
          <p className="text-muted-foreground mb-6">{t('dashboard.addOfferAttract')}</p>
          <Button onClick={() => { setEditingOffer(null); setShowForm(true); }} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            {t('dashboard.addFirstOffer')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {offers.map((offer: any) => {
            const isExpired = new Date(offer.endDate) < new Date();
            const isUpcoming = new Date(offer.startDate) > new Date();
            const discount = offer.originalPrice && offer.offerPrice
              ? Math.round((1 - parseFloat(offer.offerPrice) / parseFloat(offer.originalPrice)) * 100)
              : 0;
            return (
              <Card key={offer.id} className={`overflow-hidden ${isExpired ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {resolveOfferImageUrl(offer) ? (
                      <img
                        src={resolveOfferImageUrl(offer)}
                        alt=""
                        loading="lazy"
                        className="w-20 h-20 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <OfferImagePlaceholder size="sm" className="rounded-lg" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{offer.titleAr}</h3>
                        <SemanticBadge
                          tone={mapOfferTypeToBadgeTone(offer.offerType)}
                          density="outline"
                          size="sm"
                        >
                          {OFFER_TYPE_LABELS[offer.offerType]}
                        </SemanticBadge>
                        {isExpired && (
                          <SemanticBadge tone="danger" density="filled" size="sm">
                            {t('dashboard.expired')}
                          </SemanticBadge>
                        )}
                        {isUpcoming && (
                          <SemanticBadge tone="neutral" density="soft" size="sm">
                            {t('dashboard.upcoming')}
                          </SemanticBadge>
                        )}
                        {!isExpired && !isUpcoming && offer.isActive && (
                          <SemanticBadge tone="success" density="soft" size="sm">
                            {t('dashboard.active')}
                          </SemanticBadge>
                        )}
                      </div>
                      {offer.descriptionAr && <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{offer.descriptionAr}</p>}
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">{offer.offerPrice} {currencySymbol || t('dashboard.sar')}</span>
                        <span className="text-sm text-muted-foreground line-through">{offer.originalPrice} {currencySymbol || t('dashboard.sar')}</span>
                        {discount > 0 && (
                          <CountBadge count={`-${discount}%`} tone="danger" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatLocaleDateTime(offer.startDate, language === 'ar' ? 'ar-SA' : 'en-US')}
                        </span>
                        <span>→</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatLocaleDateTime(offer.endDate, language === 'ar' ? 'ar-SA' : 'en-US')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingOffer(offer); setShowForm(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(offer.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Offer Form Dialog */}
      {showForm && (
        <OfferFormDialog
          restaurantId={restaurantId}
          offer={editingOffer}
          onClose={() => { setShowForm(false); setEditingOffer(null); }}
          currencySymbol={currencySymbol}
        />
      )}

      <SemanticConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        kind="destructive"
        icon="delete"
        title={t("dashboard.deleteOfferConfirm")}
        description={t("dashboard.deleteOfferConfirmMessage")}
        cancelLabel={t("dashboard.cancel")}
        confirmLabel={t("dashboard.delete")}
        onConfirm={() => deleteId && deleteMutation.mutate({ id: deleteId })}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Offer Form Dialog ────────────────────────────────────────

function OfferFormDialog({
  restaurantId,
  offer,
  onClose,
  currencySymbol,
}: {
  restaurantId: number;
  offer: any | null;
  onClose: () => void;
  currencySymbol?: string;
}) {
  const { t } = useLanguage();
  const [titleAr, setTitleAr] = useState(offer?.titleAr || "");
  const [titleEn, setTitleEn] = useState(offer?.titleEn || "");
  const [descriptionAr, setDescriptionAr] = useState(offer?.descriptionAr || "");
  const [descriptionEn, setDescriptionEn] = useState(offer?.descriptionEn || "");
  const [offerType, setOfferType] = useState<"daily" | "weekly" | "monthly">(offer?.offerType || "daily");
  const [originalPrice, setOriginalPrice] = useState(offer?.originalPrice || "");
  const [offerPrice, setOfferPrice] = useState(offer?.offerPrice || "");
  const [startDate, setStartDate] = useState(
    offer?.startDate ? new Date(offer.startDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState(
    offer?.endDate ? new Date(offer.endDate).toISOString().slice(0, 16) : ""
  );
  const [imageSource, setImageSource] = useState<OfferImageSource>({
    imageUrl: offer?.imageUrl ?? null,
    image: offer?.image ?? null,
  });
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const utils = trpc.useUtils();

  const OFFER_TYPE_LABELS: Record<string, string> = {
    daily: t('dashboard.daily'),
    weekly: t('dashboard.weekly'),
    monthly: t('dashboard.monthly'),
  };

  const uploadImageMutation = trpc.offer.uploadImage.useMutation();
  const createMutation = trpc.offer.create.useMutation();
  const updateMutation = trpc.offer.update.useMutation();

  useEffect(() => {
    if (!offer) return;
    setImageSource({ imageUrl: offer.imageUrl ?? null, image: offer.image ?? null });
    setPendingImageFile(null);
  }, [offer?.id, offer?.imageUrl, offer?.image]);

  const handleSubmit = async () => {
    if (!titleAr || !originalPrice || !offerPrice || !startDate || !endDate) {
      toast.error(t('dashboard.fillAllFields'));
      return;
    }
    try {
      if (offer) {
        await updateMutation.mutateAsync({
          id: offer.id,
          titleAr,
          titleEn: titleEn || undefined,
          descriptionAr: descriptionAr || undefined,
          descriptionEn: descriptionEn || undefined,
          offerType,
          originalPrice,
          offerPrice,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          imageUrl: imageSource.imageUrl || undefined,
        });
        toast.success(t('dashboard.updateOfferSuccess'));
      } else {
        const created = await createMutation.mutateAsync({
          restaurantId,
          titleAr,
          titleEn: titleEn || undefined,
          descriptionAr: descriptionAr || undefined,
          descriptionEn: descriptionEn || undefined,
          offerType,
          originalPrice,
          offerPrice,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        });
        if (pendingImageFile && created.id) {
          await uploadPendingOfferImage(created.id, pendingImageFile, (input) =>
            uploadImageMutation.mutateAsync(input)
          );
        }
        toast.success(t('dashboard.addOfferSuccess'));
      }
      await utils.offer.list.invalidate({ restaurantId });
      onClose();
    } catch {
      toast.error(offer ? t('dashboard.updateOfferError') : t('dashboard.addOfferError'));
    }
  };

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || uploadImageMutation.isPending;

  useEffect(() => {
    if (!offer && startDate && offerType) {
      const start = new Date(startDate);
      const end = new Date(start);
      if (offerType === "daily") end.setDate(end.getDate() + 1);
      else if (offerType === "weekly") end.setDate(end.getDate() + 7);
      else if (offerType === "monthly") end.setMonth(end.getMonth() + 1);
      setEndDate(end.toISOString().slice(0, 16));
    }
  }, [offerType, startDate, offer]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{offer ? t('dashboard.editOffer') : t('dashboard.addNewOffer')}</DialogTitle>
          <DialogDescription>{offer ? t('dashboard.editOfferData') : t('dashboard.addOfferDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <OfferImageUpload
            offerId={offer?.id}
            value={imageSource}
            onChange={setImageSource}
            onPendingFile={setPendingImageFile}
            disabled={isSubmitting}
          />

          <div>
            <Label>{t('dashboard.offerType')}</Label>
            <div className="flex gap-2 mt-1">
              {(["daily", "weekly", "monthly"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOfferType(type)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                    offerType === type
                      ? cn(
                          semanticBadgeToneClass(
                            mapOfferTypeToBadgeTone(type),
                            "soft"
                          ),
                          "border-current"
                        )
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {OFFER_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t('dashboard.offerTitleAr')}</Label>
              <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder={t('dashboard.exampleOffer')} className="mt-1" />
            </div>
            <div>
              <Label>{t('dashboard.offerTitleEn')}</Label>
              <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Lunch Deal" className="mt-1" />
            </div>
          </div>

          <div>
            <Label>{t('dashboard.offerDescriptionAr')}</Label>
            <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} placeholder={t('dashboard.exampleDescription')} className="mt-1" rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t('dashboard.originalPrice')}</Label>
              <Input type="number" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="25.00" className="mt-1" />
            </div>
            <div>
              <Label>{t('dashboard.offerPrice')}</Label>
              <Input type="number" step="0.01" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="15.00" className="mt-1" />
            </div>
          </div>

          {originalPrice && offerPrice && parseFloat(originalPrice) > 0 && (
            <div className="bg-green-500/10 text-green-500 rounded-lg p-3 text-center text-sm font-medium">
              {t('dashboard.discount')} {Math.round((1 - parseFloat(offerPrice) / parseFloat(originalPrice)) * 100)}% - {t('dashboard.save2')} {(parseFloat(originalPrice) - parseFloat(offerPrice)).toFixed(2)} {currencySymbol || t('dashboard.sar')}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t('dashboard.startDate')}</Label>
              <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{t('dashboard.endDate')}</Label>
              <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('dashboard.cancel')}</Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            {offer ? t('dashboard.updateOffer') : t('dashboard.addOffer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────
function SettingsTab({ restaurant, onBack }: { restaurant: any; onBack: () => void }) {
  const { t, language } = useLanguage();
  const [nameAr, setNameAr] = useState(restaurant.nameAr);
  const [nameEn, setNameEn] = useState(restaurant.nameEn || "");
  const [descriptionAr, setDescriptionAr] = useState(restaurant.descriptionAr || "");
  const [descriptionEn, setDescriptionEn] = useState(restaurant.descriptionEn || "");
  const [phone, setPhone] = useState(restaurant.phone || "");
  const [address, setAddress] = useState(restaurant.address || "");
  const [isActive, setIsActive] = useState(restaurant.isActive);
  const [selectedCountry, setSelectedCountry] = useState(restaurant.countryCode || "");
  const [selectedCurrency, setSelectedCurrency] = useState(restaurant.currencyCode || "");
  const [currencySymbol, setCurrencySymbol] = useState(restaurant.currencySymbol || "");
  const [showCurrencyChoice, setShowCurrencyChoice] = useState(false);
  const [localCurrencyCode, setLocalCurrencyCode] = useState("");
  const [localCurrencySymbol, setLocalCurrencySymbol] = useState("");
  const [localCurrencyNameAr, setLocalCurrencyNameAr] = useState("");
  const [localCurrencyNameEn, setLocalCurrencyNameEn] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(Boolean(restaurant.taxEnabled));
  const [taxMode, setTaxMode] = useState<CheckTaxMode>(() =>
    resolveTaxMode(restaurant.taxMode)
  );
  const [taxRatePercent, setTaxRatePercent] = useState(() =>
    extractPrimaryTaxRatePercent(restaurant.taxPolicyJson)
  );
  const [taxRateError, setTaxRateError] = useState<string | null>(null);
  const [taxSuggestion, setTaxSuggestion] =
    useState<CountryFinancialPolicySuggestion | null>(null);
  const [whatsapp, setWhatsapp] = useState(restaurant.whatsapp || "");
  const [snapchat, setSnapchat] = useState(restaurant.snapchat || "");
  const [instagram, setInstagram] = useState(restaurant.instagram || "");
  const [xTwitter, setXTwitter] = useState(restaurant.xTwitter || "");
  const [locationUrl, setLocationUrl] = useState(restaurant.locationUrl || "");
  const [workingHours, setWorkingHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(() => {
    try {
      const raw = restaurant.workingHours;
      if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {}
    return {
      sunday: { open: '09:00', close: '23:00', closed: false },
      monday: { open: '09:00', close: '23:00', closed: false },
      tuesday: { open: '09:00', close: '23:00', closed: false },
      wednesday: { open: '09:00', close: '23:00', closed: false },
      thursday: { open: '09:00', close: '23:00', closed: false },
      friday: { open: '09:00', close: '23:00', closed: false },
      saturday: { open: '09:00', close: '23:00', closed: false },
    };
  });
  const [tableLabel, setTableLabel] = useState<'tables' | 'rooms'>(restaurant.tableLabel || 'tables');
  const [showDelete, setShowDelete] = useState(false);
  const [tempClosed, setTempClosed] = useState<boolean>(() => {
    try {
      const raw = restaurant.temporaryClosure;
      if (raw) { const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; return parsed.active || false; }
    } catch {}
    return false;
  });
  const [tempClosedMsg, setTempClosedMsg] = useState<string>(() => {
    try {
      const raw = restaurant.temporaryClosure;
      if (raw) { const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; return parsed.message || ''; }
    } catch {}
    return '';
  });
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayTitleAr, setHolidayTitleAr] = useState('');
  const [holidayTitleEn, setHolidayTitleEn] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayFullDay, setHolidayFullDay] = useState(true);
  const [holidayOpen, setHolidayOpen] = useState('09:00');
  const [holidayClose, setHolidayClose] = useState('23:00');

  const { isAuthenticated, authPending } = useAuth();
  const queriesEnabled = restaurantQueriesEnabled(
    authPending,
    isAuthenticated,
    restaurant?.id ?? 0
  );
  const { data: holidays, refetch: refetchHolidays } = trpc.holiday.list.useQuery(
    { restaurantId: restaurant.id },
    { enabled: queriesEnabled }
  );
  const createHolidayMut = trpc.holiday.create.useMutation({ onSuccess: () => { refetchHolidays(); setShowAddHoliday(false); setHolidayTitleAr(''); setHolidayTitleEn(''); setHolidayDate(''); setHolidayFullDay(true); } });
  const deleteHolidayMut = trpc.holiday.delete.useMutation({ onSuccess: () => refetchHolidays() });

  const { data: countries } = trpc.countryCurrency.getAll.useQuery();

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const country = countries?.find(c => c.countryCode === countryCode);
    if (country) {
      setLocalCurrencyCode(country.currencyCode);
      setLocalCurrencySymbol(country.currencySymbol);
      setLocalCurrencyNameAr(country.currencyNameAr || '');
      setLocalCurrencyNameEn(country.currencyNameEn || '');
      if (country.currencyCode === 'USD') {
        setSelectedCurrency('USD');
        setCurrencySymbol('$');
        setShowCurrencyChoice(false);
      } else {
        setShowCurrencyChoice(true);
        setSelectedCurrency(country.currencyCode);
        setCurrencySymbol(country.currencySymbol);
      }
    }
    // BUSINESS-TAX-POLICY-SETTINGS-1 — suggest only; never auto-overwrite tax config.
    setTaxSuggestion(getCountryFinancialPolicySuggestion(countryCode));
  };

  const applyTaxSuggestion = () => {
    if (!taxSuggestion) return;
    setTaxEnabled(taxSuggestion.taxEnabled);
    setTaxMode(taxSuggestion.taxMode);
    setTaxRatePercent(taxSuggestion.taxRatePercent);
    setTaxRateError(null);
    setTaxSuggestion(null);
  };

  const handleCurrencySelect = (type: 'local' | 'usd') => {
    if (type === 'usd') {
      setSelectedCurrency('USD');
      setCurrencySymbol('$');
    } else {
      setSelectedCurrency(localCurrencyCode);
      setCurrencySymbol(localCurrencySymbol);
    }
  };
  // Auto-detect country from currencyCode when countryCode is missing (for older restaurants)
  useEffect(() => {
    if (!selectedCountry && selectedCurrency && countries?.length) {
      const match = countries.find(c => c.currencyCode === selectedCurrency);
      if (match) {
        setSelectedCountry(match.countryCode);
      }
    }
  }, [countries, selectedCountry, selectedCurrency]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [dragOverLogo, setDragOverLogo] = useState(false);
  const [dragOverCover, setDragOverCover] = useState(false);

  const utils = trpc.useUtils();

  const updateMutation = trpc.restaurant.update.useMutation({
    onSuccess: () => {
      utils.restaurant.getById.invalidate();
      utils.restaurant.list.invalidate();
      toast.success(t('dashboard.updateRestaurantSuccess'));
    },
    onError: (err) => toastTrpcError(err, t),
  });

  const deleteMutation = trpc.restaurant.delete.useMutation({
    onSuccess: () => {
      utils.restaurant.list.invalidate();
      toast.success(t('dashboard.deleteRestaurantSuccess'));
      onBack();
    },
    onError: (err) => toastTrpcError(err, t),
  });

  const uploadImageMutation = trpc.restaurant.uploadImage.useMutation({
    onSuccess: () => {
      utils.restaurant.getById.invalidate();
      utils.restaurant.list.invalidate();
      toast.success(t('dashboard.uploadSuccess'));
    },
    onError: (err) => toastTrpcError(err, t),
  });

  const deleteImageMutation = trpc.restaurant.deleteImage.useMutation({
    onSuccess: () => {
      utils.restaurant.getById.invalidate();
      utils.restaurant.list.invalidate();
      toast.success(t('dashboard.deleteImageSuccess'));
    },
    onError: (err) => toastTrpcError(err, t),
  });

  const handleImageUpload = (file: File, imageType: "logo" | "cover") => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('dashboard.invalidImageType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('dashboard.imageTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadImageMutation.mutate({
        restaurantId: restaurant.id,
        imageData: base64,
        fileName: file.name,
        contentType: file.type,
        imageType,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent, imageType: "logo" | "cover") => {
    e.preventDefault();
    if (imageType === "logo") setDragOverLogo(true);
    else setDragOverCover(true);
  };

  const handleDragLeave = (imageType: "logo" | "cover") => {
    if (imageType === "logo") setDragOverLogo(false);
    else setDragOverCover(false);
  };

  const handleDrop = (e: React.DragEvent, imageType: "logo" | "cover") => {
    e.preventDefault();
    if (imageType === "logo") setDragOverLogo(false);
    else setDragOverCover(false);
    const files = e.dataTransfer.files;
    if (files?.[0]) {
      handleImageUpload(files[0], imageType);
    }
  };

  const handleDeleteImage = (imageType: "logo" | "cover") => {
    deleteImageMutation.mutate({
      restaurantId: restaurant.id,
      imageType,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Images */}
      <Card className={dash.card}>
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t('dashboard.restaurantImages')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-foreground mb-3 block">{t('dashboard.logo')}</Label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragOverLogo ? 'border-primary bg-primary/5' : 'border-border/50 bg-secondary/30'}`}
              onDragOver={(e) => handleDragOver(e, "logo")}
              onDragLeave={() => handleDragLeave("logo")}
              onDrop={(e) => handleDrop(e, "logo")}
            >
              <div className="flex flex-col items-center gap-4">
                {resolveImageUrl(restaurant.logoUrl) ? (
                  <div className="relative inline-block">
                    <img src={resolveImageUrl(restaurant.logoUrl)} alt="" className="w-24 h-24 rounded-lg object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 rounded-lg transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadImageMutation.isPending}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-red-500/20"
                        onClick={() => handleDeleteImage("logo")}
                        disabled={deleteImageMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Store className="w-12 h-12 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">{t('dashboard.dragDropLogo')}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadImageMutation.isPending}
                  className="border-border text-foreground"
                >
                  {uploadImageMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                      {t('dashboard.uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ml-1" />
                      {t('dashboard.uploadLogo')}
                    </>
                  )}
                </Button>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "logo")} />
            </div>
          </div>
          <div>
            <Label className="text-foreground mb-3 block">{t('dashboard.coverImage')}</Label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 transition-colors ${dragOverCover ? 'border-primary bg-primary/5' : 'border-border/50 bg-secondary/30'}`}
              onDragOver={(e) => handleDragOver(e, "cover")}
              onDragLeave={() => handleDragLeave("cover")}
              onDrop={(e) => handleDrop(e, "cover")}
            >
              <div className="flex flex-col items-center gap-4">
                {resolveImageUrl(restaurant.coverUrl) ? (
                  <div className="relative w-full">
                    <img src={resolveImageUrl(restaurant.coverUrl)} alt="" className="w-full h-40 rounded-lg object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 rounded-lg transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadImageMutation.isPending}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-red-500/20"
                        onClick={() => handleDeleteImage("cover")}
                        disabled={deleteImageMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">{t('dashboard.dragDropCover')}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadImageMutation.isPending}
                  className="border-border text-foreground"
                >
                  {uploadImageMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                      {t('dashboard.uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ml-1" />
                      {t('dashboard.uploadCover')}
                    </>
                  )}
                </Button>
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "cover")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className={dash.card}>
        <CardContent className="space-y-8 p-6 sm:p-8">
          <RestaurantBasicInfoSection
            t={t}
            language={language}
            nameAr={nameAr}
            setNameAr={setNameAr}
            nameEn={nameEn}
            setNameEn={setNameEn}
            descriptionAr={descriptionAr}
            setDescriptionAr={setDescriptionAr}
            descriptionEn={descriptionEn}
            setDescriptionEn={setDescriptionEn}
          />

          <RestaurantContactLinksSection
            t={t}
            language={language}
            phone={phone}
            setPhone={setPhone}
            address={address}
            setAddress={setAddress}
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
            locationUrl={locationUrl}
            setLocationUrl={setLocationUrl}
            instagram={instagram}
            setInstagram={setInstagram}
            snapchat={snapchat}
            setSnapchat={setSnapchat}
            xTwitter={xTwitter}
            setXTwitter={setXTwitter}
          />

          <WorkingHoursEditor
            t={t}
            language={language}
            workingHours={workingHours}
            setWorkingHours={setWorkingHours}
          />

          <div className="space-y-6 border-t border-border/30 pt-8">
            <div>
              <Label className="text-sm font-medium text-foreground">{t('dashboard.country')}</Label>
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border/45 bg-[#0f131a]/90 px-3 text-foreground shadow-none transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15"
              >
              <option value="">{t('dashboard.selectCountry')}</option>
              {countries?.map((c) => (
                <option key={c.countryCode} value={c.countryCode}>
                  {language === 'ar' ? c.countryNameAr : c.countryNameEn}
                </option>
              ))}
            </select>
          </div>
          {selectedCountry && showCurrencyChoice && localCurrencyCode !== 'USD' && (
            <div className="space-y-2">
              <Label className="text-foreground">{t('dashboard.chooseCurrency')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleCurrencySelect('local')}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    selectedCurrency === localCurrencyCode
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border bg-input hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl font-bold block">{localCurrencySymbol}</span>
                  <span className="text-sm text-foreground font-medium">{localCurrencyCode}</span>
                  <span className="text-xs text-muted-foreground block">
                    {language === 'ar' ? localCurrencyNameAr : localCurrencyNameEn}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencySelect('usd')}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    selectedCurrency === 'USD'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border bg-input hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl font-bold block">$</span>
                  <span className="text-sm text-foreground font-medium">USD</span>
                  <span className="text-xs text-muted-foreground block">
                    {language === 'ar' ? 'دولار أمريكي' : 'US Dollar'}
                  </span>
                </button>
              </div>
            </div>
          )}
          {selectedCurrency && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold text-lg">{currencySymbol}</span>
                <span className="text-foreground">
                  {t('dashboard.currencyWillBe')}: <strong>{selectedCurrency}</strong>
                  {selectedCurrency === 'USD'
                    ? ` (${language === 'ar' ? 'دولار أمريكي' : 'US Dollar'})`
                    : ` (${language === 'ar' ? localCurrencyNameAr || countries?.find(c => c.countryCode === selectedCountry)?.currencyNameAr : localCurrencyNameEn || countries?.find(c => c.countryCode === selectedCountry)?.currencyNameEn})`
                  }
                </span>
              </div>
            </div>
          )}

          <RestaurantFinancialPolicySection
            language={language}
            taxEnabled={taxEnabled}
            setTaxEnabled={(enabled) => {
              setTaxEnabled(enabled);
              if (!enabled) setTaxRateError(null);
            }}
            taxRatePercent={taxRatePercent}
            setTaxRatePercent={(value) => {
              setTaxRatePercent(value);
              if (taxRateError) setTaxRateError(null);
            }}
            taxRateError={taxRateError}
            taxMode={taxMode}
            setTaxMode={setTaxMode}
            suggestion={taxSuggestion}
            onApplySuggestion={applyTaxSuggestion}
            onDismissSuggestion={() => setTaxSuggestion(null)}
          />

          <SaudiTaxProfileSection
            language={language}
            restaurantId={restaurant.id}
            countryCode={selectedCountry || restaurant.countryCode || ""}
          />

          {/* Table/Room Label Toggle */}
          <div className="space-y-2">
            <Label className="text-foreground">{language === 'ar' ? 'مسمى الوحدات' : 'Unit Label'}</Label>
            <p className="text-xs text-muted-foreground">{language === 'ar' ? 'اختر المسمى المناسب لنشاطك (طاولات أو غرف)' : 'Choose the appropriate label for your business (tables or rooms)'}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTableLabel('tables')}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  tableLabel === 'tables'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-input hover:border-primary/50 text-foreground'
                }`}
              >
                <span className="text-2xl block mb-1">🍽️</span>
                <span className="text-sm font-medium">{language === 'ar' ? 'طاولات' : 'Tables'}</span>
              </button>
              <button
                type="button"
                onClick={() => setTableLabel('rooms')}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  tableLabel === 'rooms'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-input hover:border-primary/50 text-foreground'
                }`}
              >
                <span className="text-2xl block mb-1">🚪</span>
                <span className="text-sm font-medium">{language === 'ar' ? 'غرف' : 'Rooms'}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-foreground">{t('dashboard.restaurantStatus')}</Label>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className={`text-sm ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {isActive ? t('dashboard.active') : t('dashboard.disabled')}
              </span>
            </div>
          </div>
          <Button
            onClick={() => {
              if (taxEnabled) {
                const rateErr = validateTaxRatePercent(taxRatePercent);
                if (rateErr) {
                  setTaxRateError(rateErr);
                  toast.error(
                    language === "ar"
                      ? "تحقق من نسبة الضريبة قبل الحفظ."
                      : "Fix the tax rate before saving."
                  );
                  return;
                }
              } else if (taxRatePercent.trim() !== "") {
                const rateErr = validateTaxRatePercent(taxRatePercent);
                if (rateErr) {
                  setTaxRateError(rateErr);
                  toast.error(
                    language === "ar"
                      ? "تحقق من نسبة الضريبة قبل الحفظ."
                      : "Fix the tax rate before saving."
                  );
                  return;
                }
              }
              setTaxRateError(null);
              const taxPolicy = buildBusinessTaxPolicyDocument({
                taxRatePercent,
                componentName: language === "ar" ? "ضريبة القيمة المضافة" : "VAT",
                existingPolicyJson: restaurant.taxPolicyJson,
              });
              updateMutation.mutate({
                id: restaurant.id, nameAr, nameEn: nameEn || undefined,
                descriptionAr: descriptionAr || undefined, descriptionEn: descriptionEn || undefined,
                phone: phone || undefined, address: address || undefined, isActive,
                countryCode: selectedCountry || undefined, currencyCode: selectedCurrency || undefined,
                currencySymbol: currencySymbol || undefined,
                taxEnabled,
                taxMode,
                taxPolicy: {
                  version: taxPolicy.version,
                  components: taxPolicy.components.map((component) => ({
                    id: component.id,
                    name: component.name,
                    ratePercent: component.ratePercent,
                  })),
                },
                whatsapp: whatsapp || null,
                snapchat: snapchat || null,
                instagram: instagram || null,
                xTwitter: xTwitter || null,
                locationUrl: locationUrl || null,
                workingHours: JSON.stringify(workingHours),
                temporaryClosure: JSON.stringify({ active: tempClosed, message: tempClosedMsg }),
                tableLabel,
              });
            }}
            disabled={updateMutation.isPending}
            className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-none hover:bg-primary/90"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('dashboard.save')}
          </Button>
          </div>
        </CardContent>
      </Card>

      {/* Temporary Closure */}
      <Card className={cn(dash.card, tempClosed && "border-amber-500/50")}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-5 h-5 ${tempClosed ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <h3 className="text-lg font-bold text-foreground">{t('dashboard.temporaryClosure')}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{t('dashboard.temporaryClosureDesc')}</p>
          <div className="flex items-center justify-between">
            <Label className="text-foreground">{t('dashboard.closedNow')}</Label>
            <div className="flex items-center gap-2">
              <Switch checked={tempClosed} onCheckedChange={setTempClosed} />
              <span className={`text-sm font-medium ${tempClosed ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {tempClosed ? t('dashboard.yes') : t('dashboard.no')}
              </span>
            </div>
          </div>
          {tempClosed && (
            <div>
              <Label className="text-foreground">{t('dashboard.closureMessage')}</Label>
              <Input
                value={tempClosedMsg}
                onChange={(e) => setTempClosedMsg(e.target.value)}
                placeholder={t('dashboard.closureMessagePlaceholder')}
                className="mt-1 bg-input border-border text-foreground"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card className={dash.card}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">{t('dashboard.holidays')}</h3>
            </div>
            <Button size="sm" onClick={() => setShowAddHoliday(!showAddHoliday)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <CalendarPlus className="w-4 h-4 ml-1" />
              {t('dashboard.addHoliday')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t('dashboard.holidaysDesc')}</p>

          {showAddHoliday && (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-foreground">{t('dashboard.holidayTitleAr')}</Label>
                  <Input value={holidayTitleAr} onChange={(e) => setHolidayTitleAr(e.target.value)} placeholder={t('dashboard.holidayTitleArPlaceholder')} className="mt-1 bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">{t('dashboard.holidayTitleEn')}</Label>
                  <Input value={holidayTitleEn} onChange={(e) => setHolidayTitleEn(e.target.value)} placeholder={t('dashboard.holidayTitleEnPlaceholder')} className="mt-1 bg-input border-border text-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-foreground">{t('dashboard.holidayDate')}</Label>
                <Input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className="mt-1 bg-input border-border text-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-foreground">{t('dashboard.fullDayClosed')}</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={holidayFullDay} onCheckedChange={setHolidayFullDay} />
                  <span className="text-sm text-muted-foreground">{holidayFullDay ? t('dashboard.closed') : t('dashboard.customHours')}</span>
                </div>
              </div>
              {!holidayFullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">{t('dashboard.openTime')}</Label>
                    <Input type="time" value={holidayOpen} onChange={(e) => setHolidayOpen(e.target.value)} className="mt-1 bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground">{t('dashboard.closeTime')}</Label>
                    <Input type="time" value={holidayClose} onChange={(e) => setHolidayClose(e.target.value)} className="mt-1 bg-input border-border text-foreground" />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => createHolidayMut.mutate({
                    restaurantId: restaurant.id,
                    titleAr: holidayTitleAr,
                    titleEn: holidayTitleEn || undefined,
                    date: holidayDate,
                    isFullDayClosed: holidayFullDay,
                    openTime: holidayFullDay ? undefined : holidayOpen,
                    closeTime: holidayFullDay ? undefined : holidayClose,
                  })}
                  disabled={createHolidayMut.isPending || !holidayTitleAr || !holidayDate}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {createHolidayMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('dashboard.save')}
                </Button>
                <Button variant="outline" onClick={() => setShowAddHoliday(false)}>{t('dashboard.cancel')}</Button>
              </div>
            </div>
          )}

          {/* Holidays List */}
          {holidays && holidays.length > 0 ? (
            <div className="space-y-2">
              {holidays.map((h) => {
                const isPast = h.date < todayYmd();
                return (
                  <div key={h.id} className={`flex items-center justify-between p-3 rounded-lg border ${isPast ? 'border-border/50 opacity-60' : 'border-border'} bg-background`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{language === 'ar' ? h.titleAr : (h.titleEn || h.titleAr)}</span>
                        {isPast && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{t('dashboard.past')}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{h.date}</span>
                        {h.isFullDayClosed ? (
                          <span className="text-amber-500 font-medium">{t('dashboard.fullDayClosed')}</span>
                        ) : (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{h.openTime} - {h.closeTime}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteHolidayMut.mutate({ id: h.id })} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('dashboard.noHolidays')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className={cn(dash.card, "border-destructive/40")}>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-destructive mb-2">{t('dashboard.dangerZone')}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('dashboard.dangerZoneDescription')}</p>
          <Button variant="outline" onClick={() => setShowDelete(true)} className="border-destructive/50 text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 ml-1" />
            {t('dashboard.deleteRestaurant')}
          </Button>
        </CardContent>
      </Card>

      <SemanticConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        kind="destructive"
        icon="delete"
        title={t("dashboard.deleteForever")}
        description={t("dashboard.deleteForeverConfirm")}
        cancelLabel={t("dashboard.cancel")}
        confirmLabel={t("dashboard.deleteForever")}
        onConfirm={() => deleteMutation.mutate({ id: restaurant.id })}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}


// ─── Orders workspace helpers (production OrdersTab parity) ───

type DashboardOrder = {
  id: number;
  status: string;
  totalAmount: string;
  createdAt: string;
  orderNumber?: string;
  businessDay?: string | null;
  dailyDisplayNumber?: number | null;
  displayReference?: string;
  displayOrderNumber?: string;
  tableNumber?: number;
  sessionId?: number | null;
  serviceMode?: string | null;
  fulfilmentAnchorType?: string | null;
  fulfilmentLabel?: string | null;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items?: unknown[];
};

function orderDateYmd(value: string | Date | null | undefined): string {
  return convertUtcToRestaurantTime(value)?.ymd ?? "";
}

function orderDateYearMonth(
  value: string | Date | null | undefined
): { year: number; month: number } | null {
  const ymd = orderDateYmd(value);
  if (!ymd) return null;
  const [year, month] = ymd.split("-").map(Number);
  return year && month ? { year, month } : null;
}

function orderDateDay(value: string | Date | null | undefined): number {
  const ymd = orderDateYmd(value);
  if (!ymd) return 0;
  return Number(ymd.split("-")[2]) || 0;
}

// ─── Orders Tab ─────────────────────────────────────────────
function OrdersTab({ restaurantId, currencySymbol, tableLabel }: { restaurantId: number; currencySymbol?: string; tableLabel?: string }) {
  const { language, t } = useLanguage();
  const { isAuthenticated, authPending } = useAuth();
  const ordersEnabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const isRooms = tableLabel === "rooms";
  const unitAr = isRooms ? "غرفة" : "طاولة";
  const unitEn = isRooms ? "Room" : "Table";
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timelineSessionId, setTimelineSessionId] = useState<number | null>(null);

  useDevQueryRuntimeLog("order.list", {
    enabled: ordersEnabled,
    authPending,
    isAuthenticated,
    pollMs: ordersEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });
  const { data: allOrders, refetch, error: ordersError } = trpc.order.list.useQuery(
    { restaurantId },
    orderListQueryOptions(ordersEnabled)
  );
  const ordersBlocked = isEmailNotVerifiedError(ordersError);

  const orders = useMemo(() => {
    const list = (allOrders ?? []) as DashboardOrder[];
    if (statusFilter === "all") return list;
    return list.filter((o) => o.status === statusFilter);
  }, [allOrders, statusFilter]);

  const sessionOrderCounts = useMemo(
    () => buildVisibleSessionOrderCounts(orders),
    [orders]
  );

  const updateStatusMutation = trpc.order.updateStatus.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toastTrpcError(err, t),
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <h1 className={dash.pageTitle}>{language === "ar" ? "الطلبات" : "Orders"}</h1>
        <p className={dash.pageSub}>
          {language === "ar" ? "إدارة الطلبات المباشرة" : "Manage live orders"}
        </p>
      </div>

      {ordersBlocked ? (
        <VerificationRequiredPanel variant="orders" />
      ) : (
      <>
      <div className="flex flex-wrap gap-2.5 rounded-2xl border border-border/40 bg-muted/10 p-2 sm:p-2.5">
            {["all", "pending", "preparing", "ready", "served", "cancelled"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-medium transition-all sm:text-base",
                  statusFilter === status
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
              >
                {status === "all"
                  ? (language === "ar" ? "الكل" : "All")
                  : formatOrderStatusLabel(
                      status as OrderLifecycleStatus,
                      language === "ar" ? "ar" : "en"
                    )}
              </button>
            ))}
          </div>

      {!orders || orders.length === 0 ? (
        <div className="py-16 text-center sm:py-20">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/45 bg-muted/20">
            <ClipboardList className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm text-muted-foreground">
            {language === "ar" ? "لا توجد طلبات" : "No orders yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {orders.map((order: any) => {
            const { presentation, linePrices } = mapDashboardOrderPresentation(
              {
                id: order.id,
                orderNumber: order.orderNumber,
                displayReference: order.displayReference,
                businessDay: order.businessDay,
                dailyDisplayNumber: order.dailyDisplayNumber,
                status: order.status,
                tableNumber: order.tableNumber,
                serviceMode: order.serviceMode ?? undefined,
                fulfilmentAnchorType: order.fulfilmentAnchorType ?? undefined,
                fulfilmentLabel: order.fulfilmentLabel ?? undefined,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                notes: order.notes,
                totalAmount: order.totalAmount,
                createdAt: order.createdAt,
                items: Array.isArray(order.items)
                  ? order.items.map((line: any) => ({
                      id: line.id,
                      quantity: line.quantity,
                      nameAr: line.nameAr,
                      nameEn: line.nameEn,
                      price: line.price,
                      itemNotes: line.itemNotes ?? null,
                      modifiers: line.modifiers ?? [],
                    }))
                  : [],
              },
              { tableUnit: isRooms ? "room" : "table" }
            );

            return (
              <div key={order.id} className="space-y-2">
                {hasDashboardSession(order.sessionId) && (
                  <button
                    type="button"
                    onClick={() => setTimelineSessionId(order.sessionId)}
                    className="block text-start text-sm text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={
                      language === "ar"
                        ? `عرض سجل جلسة #${order.sessionId}`
                        : `View session #${order.sessionId} timeline`
                    }
                  >
                    {formatDashboardSessionLabel(
                      order.sessionId,
                      language === "ar" ? "ar" : "en"
                    )}
                    {(sessionOrderCounts.get(order.sessionId) ?? 0) > 1 && (
                      <>
                        {" · "}
                        {formatDashboardSessionOrderCount(
                          sessionOrderCounts.get(order.sessionId)!,
                          language === "ar" ? "ar" : "en"
                        )}
                      </>
                    )}
                  </button>
                )}

                <OperationalOrderCard
                  presentation={presentation}
                  language={language}
                  currencySymbol={currencySymbol || "ر.س"}
                  density="comfortable"
                  domain="orders"
                  showFinancial
                  showCustomer
                  showSlaTimeline
                  showExecutionFooter={false}
                  actionMode="none"
                  linePrices={linePrices}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <p className="text-xs text-muted-foreground">
                    {formatRiyadhDateTime(
                      order.createdAt,
                      language === "ar" ? "ar-SA" : "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                  <div className="flex gap-1">
                    {order.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: order.id,
                              status: "preparing",
                            })
                          }
                        >
                          {language === "ar" ? "تحضير" : "Prepare"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-red-500/50 text-red-400 hover:bg-red-500/10"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: order.id,
                              status: "cancelled",
                            })
                          }
                        >
                          {language === "ar" ? "إلغاء" : "Cancel"}
                        </Button>
                      </>
                    )}
                    {order.status === "preparing" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-green-500/50 text-green-400 hover:bg-green-500/10"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: order.id,
                            status: "ready",
                          })
                        }
                      >
                        {language === "ar" ? "جاهز" : "Ready"}
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: order.id,
                            status: "served",
                          })
                        }
                      >
                        {language === "ar" ? "تم التقديم" : "Served"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}

      <DiningSessionWorkspaceSheet
        open={timelineSessionId != null}
        onOpenChange={(open) => {
          if (!open) setTimelineSessionId(null);
        }}
        restaurantId={restaurantId}
        sessionId={timelineSessionId}
        currencySymbol={currencySymbol}
        tableLabel={tableLabel}
      />
    </div>
  );
}

// ─── Tables Tab ─────────────────────────────────────────────
function TablesTab({ restaurantId, restaurant }: { restaurantId: number; restaurant: any }) {
  const { t, language } = useLanguage();
  const { isAuthenticated, authPending } = useAuth();
  const queriesEnabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const [tableCount, setTableCount] = useState(10);
  const [startFrom, setStartFrom] = useState(1);
  const [tableQRFgColor, setTableQRFgColor] = useState("#000000");
  const [tableQRBgColor, setTableQRBgColor] = useState("#ffffff");
  const [tableQRLogoScale, setTableQRLogoScale] = useState(0.42);
  const [tableQRLogoBorderRadius, setTableQRLogoBorderRadius] = useState(8);
  const [tableQRLogoBorderWidth, setTableQRLogoBorderWidth] = useState(3);
  const [tableQRLogoBorderColor, setTableQRLogoBorderColor] = useState("#000000");
  const [tableQRLogoBackgroundColor, setTableQRLogoBackgroundColor] = useState("#ffffff");
  const [showTableQRCustomization, setShowTableQRCustomization] = useState(false);
  const isRooms = restaurant?.tableLabel === 'rooms';
  const unitLabelAr = isRooms ? 'غرفة' : 'طاولة';
  const unitLabelEn = isRooms ? 'Room' : 'Table';
  const unitLabelPluralAr = isRooms ? 'غرف' : 'طاولات';
  const unitLabelPluralEn = isRooms ? 'Rooms' : 'Tables';

  const { data: tables, refetch } = trpc.table.list.useQuery(
    { restaurantId },
    { enabled: queriesEnabled }
  );
  const createMultipleMutation = trpc.table.createMultiple.useMutation({
    onSuccess: () => {
      refetch();
            toast.success(language === "ar" ? `تم إنشاء ${unitLabelPluralAr} بنجاح` : `${unitLabelPluralEn} created successfully`);
    },
  });
  const deleteMutation = trpc.table.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const menuUrl = typeof window !== "undefined" ? `${window.location.origin}/menu/${restaurant?.slug}` : "";

  return (
    <div className="space-y-6">
      {/* Create Tables */}
      <Card className={dash.card}>
        <CardHeader>
          <CardTitle className="text-base">
            {language === "ar" ? `إنشاء ${unitLabelPluralAr}` : `Create ${unitLabelPluralEn}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === "ar" ? `عدد ${unitLabelPluralAr}` : `Number of ${unitLabelPluralEn}`}</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={tableCount}
                onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>{language === "ar" ? "البداية من رقم" : "Start From"}</Label>
              <Input
                type="number"
                min={1}
                value={startFrom}
                onChange={(e) => setStartFrom(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <Button
            onClick={() => createMultipleMutation.mutate({ restaurantId, count: tableCount, startFrom })}
            disabled={createMultipleMutation.isPending}
            className="w-full"
          >
            <Plus className="w-4 h-4 ml-2" />
            {language === "ar" ? `إنشاء ${tableCount} ${unitLabelAr}` : `Create ${tableCount} ${unitLabelPluralEn}`}
          </Button>
        </CardContent>
      </Card>

      {/* Table QR Customization */}
      <Card className={dash.card}>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{language === "ar" ? "تخصيص رموز QR" : "Customize QR Codes"}</span>
            <button
              onClick={() => setShowTableQRCustomization(!showTableQRCustomization)}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              {showTableQRCustomization ? (language === "ar" ? "إخفاء" : "Hide") : (language === "ar" ? "عرض" : "Show")}
            </button>
          </CardTitle>
        </CardHeader>
        {showTableQRCustomization && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* FG Color */}
              <div>
                <Label className="text-sm text-foreground mb-2 block">
                  {language === "ar" ? "لون الرمز" : "QR Color"}
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tableQRFgColor}
                    onChange={(e) => setTableQRFgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                  />
                  <Input
                    value={tableQRFgColor}
                    onChange={(e) => setTableQRFgColor(e.target.value)}
                    className="font-mono text-sm bg-background"
                    dir="ltr"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* BG Color */}
              <div>
                <Label className="text-sm text-foreground mb-2 block">
                  {language === "ar" ? "لون الخلفية" : "Background Color"}
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tableQRBgColor}
                    onChange={(e) => setTableQRBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                  />
                  <Input
                    value={tableQRBgColor}
                    onChange={(e) => setTableQRBgColor(e.target.value)}
                    className="font-mono text-sm bg-background"
                    dir="ltr"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            {/* Logo Customization */}
            {restaurant?.logoUrl && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h5 className="text-sm font-semibold text-foreground">
                  {language === "ar" ? "تخصيص الشعار" : "Logo Customization"}
                </h5>

                {/* Logo Scale */}
                <div>
                  <Label className="text-sm text-foreground mb-2 block">
                    {language === "ar" ? "حجم الشعار" : "Logo Size"} ({(tableQRLogoScale * 100).toFixed(0)}%)
                  </Label>
                  <input
                    type="range"
                    min="0.2"
                    max="0.6"
                    step="0.05"
                    value={tableQRLogoScale}
                    onChange={(e) => setTableQRLogoScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Border Width */}
                <div>
                  <Label className="text-sm text-foreground mb-2 block">
                    {language === "ar" ? "سمك الحد" : "Border Width"} ({tableQRLogoBorderWidth}px)
                  </Label>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={tableQRLogoBorderWidth}
                    onChange={(e) => setTableQRLogoBorderWidth(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Border Radius */}
                <div>
                  <Label className="text-sm text-foreground mb-2 block">
                    {language === "ar" ? "استدارة الزوايا" : "Border Radius"} ({tableQRLogoBorderRadius}px)
                  </Label>
                  <input
                    type="range"
                    min="0"
                    max="16"
                    step="1"
                    value={tableQRLogoBorderRadius}
                    onChange={(e) => setTableQRLogoBorderRadius(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Border Color */}
                <div>
                  <Label className="text-sm text-foreground mb-2 block">
                    {language === "ar" ? "لون الحد" : "Border Color"}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tableQRLogoBorderColor}
                      onChange={(e) => setTableQRLogoBorderColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                    />
                    <Input
                      value={tableQRLogoBorderColor}
                      onChange={(e) => setTableQRLogoBorderColor(e.target.value)}
                      className="font-mono text-sm bg-background"
                      dir="ltr"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Logo Background */}
                <div>
                  <Label className="text-sm text-foreground mb-2 block">
                    {language === "ar" ? "خلفية الشعار" : "Logo Background"}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tableQRLogoBackgroundColor}
                      onChange={(e) => setTableQRLogoBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                    />
                    <Input
                      value={tableQRLogoBackgroundColor}
                      onChange={(e) => setTableQRLogoBackgroundColor(e.target.value)}
                      className="font-mono text-sm bg-background"
                      dir="ltr"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Tables List with QR */}
      {tables && tables.length > 0 && (
        <Card className={dash.card}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{language === "ar" ? `${unitLabelPluralAr} الحالية` : `Current ${unitLabelPluralEn}`}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{tables.length}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Download all QR codes as individual images
                    tables.forEach((table: any) => {
                      const tableUrl = `${menuUrl}/table/${table.tableNumber}`;
                      const canvas = document.getElementById(`qr-table-${table.tableNumber}`) as HTMLCanvasElement;
                      if (canvas) {
                        const link = document.createElement('a');
                        link.download = `table-${table.tableNumber}-qr.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                      }
                    });
                    toast.success(language === "ar" ? "جاري تحميل الباركودات..." : "Downloading QR codes...");
                  }}
                >
                  <Download className="w-3.5 h-3.5 ml-1" />
                  {language === "ar" ? "تحميل الكل" : "Download All"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {tables.map((table: any) => (
                <TableQRCard
                  key={table.id}
                  table={table}
                  menuUrl={menuUrl}
                  language={language}
                  onDelete={() => deleteMutation.mutate({ id: table.id })}
                  unitLabelAr={unitLabelAr}
                  unitLabelEn={unitLabelEn}
                  fgColor={tableQRFgColor}
                  bgColor={tableQRBgColor}
                  logoScale={tableQRLogoScale}
                  logoBorderRadius={tableQRLogoBorderRadius}
                  logoBorderWidth={tableQRLogoBorderWidth}
                  logoBorderColor={tableQRLogoBorderColor}
                  logoBackgroundColor={tableQRLogoBackgroundColor}
                  restaurant={restaurant}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Table QR Card ──────────────────────────────────────────
function TableQRCard({ table, menuUrl, language, onDelete, unitLabelAr, unitLabelEn, fgColor = "#000000", bgColor = "#ffffff", logoScale = 0.42, logoBorderRadius = 8, logoBorderWidth = 3, logoBorderColor = "#000000", logoBackgroundColor = "#ffffff", restaurant }: { table: any; menuUrl: string; language: string; onDelete: () => void; unitLabelAr?: string; unitLabelEn?: string; fgColor?: string; bgColor?: string; logoScale?: number; logoBorderRadius?: number; logoBorderWidth?: number; logoBorderColor?: string; logoBackgroundColor?: string; restaurant?: any }) {
  const tableUrl = `${menuUrl}/table/${table.tableNumber}`;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      import('qrcode').then((QRCode) => {
        QRCode.toCanvas(canvasRef.current!, tableUrl, {
          width: 180,
          margin: 2,
          color: { dark: fgColor, light: bgColor },
        });
      });
    }
  }, [tableUrl, fgColor, bgColor]);

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `table-${table.tableNumber}-qr.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(tableUrl);
    toast.success(language === "ar" ? "تم نسخ الرابط" : "Link copied");
  };

  return (
    <div className={cn(dash.card, "relative p-4 text-center group")}>
      <button
        onClick={onDelete}
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-red-500/10"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>

      <div className="text-lg font-bold text-primary mb-2">
        {language === "ar" ? `${unitLabelAr || 'طاولة'} ${table.tableNumber}` : `${unitLabelEn || 'Table'} ${table.tableNumber}`}
      </div>

      <div className="flex justify-center mb-3">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>

      <p className="text-[10px] text-muted-foreground/60 mb-3 truncate px-2" dir="ltr">
        {tableUrl}
      </p>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={downloadQR}>
          <Download className="w-3 h-3 ml-1" />
          {language === "ar" ? "تحميل" : "Download"}
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={copyLink}>
          <Copy className="w-3 h-3 ml-1" />
          {language === "ar" ? "نسخ" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
