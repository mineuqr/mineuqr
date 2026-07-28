import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  SemanticBadge,
  mapCommercialStatusToBadgeTone,
} from "@/design-system/semantic-badge";
import {
  SemanticTableActions,
  SemanticTableBody,
  SemanticTableCell,
  SemanticTableDesktop,
  SemanticTableHead,
  SemanticTableHeader,
  SemanticTableMobile,
  SemanticTableRoot,
  SemanticTableRow,
} from "@/design-system/semantic-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Loader2, Store, Search, Filter, X, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ADMIN_WORKSPACE_DIR, adminActionBtn, adminDash } from "@/components/admin/layout";
import {
  AdminActionGroup,
  AdminEmptyState,
  AdminIconButton,
  AdminLoadingState,
  OperationsTabFrame,
  ResponsiveOperationsBar,
} from "@/components/admin/operations";
import { isOwnerEntitled, ownerPlanLabel, ownerSubscriptionStatus } from "@/lib/admin/ownerCommercialDisplay";
import { cn } from "@/lib/utils";

/** REBUILD-5D — Customer Success tenants workspace. */
export function CustomerSuccessTenantsSection() {
  const gate = useAuthGate();
  const { user, isAuthenticated, authPending } = gate;
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteRestaurantId, setDeleteRestaurantId] = useState<number | null>(null);
  
  // Form state
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [subscriberPassword, setSubscriberPassword] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [address, setAddress] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [showCurrencyChoice, setShowCurrencyChoice] = useState(false);
  const [localCurrencyCode, setLocalCurrencyCode] = useState("");
  const [localCurrencySymbol, setLocalCurrencySymbol] = useState("");
  const [localCurrencyNameAr, setLocalCurrencyNameAr] = useState("");
  const [localCurrencyNameEn, setLocalCurrencyNameEn] = useState("");

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const adminEnabled = adminQueriesEnabled(
    authPending,
    isAuthenticated,
    user?.role === "admin"
  );

  // Queries
  const { data: restaurantListData, isLoading: restaurantsLoading, refetch: refetchRestaurants } =
    trpc.admin.listRestaurants.useQuery(undefined, { enabled: adminEnabled });
  const { data: countries } = trpc.countryCurrency.getAll.useQuery();

  const restaurants = useMemo(
    () =>
      (restaurantListData?.items ?? []).map((item) => ({
        ...item.restaurant,
        ownerName: item.ownerName,
        ownerCommercial: item.ownerCommercial,
      })),
    [restaurantListData]
  );

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const country = countries?.find((c: any) => c.countryCode === countryCode);
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
    } else {
      setSelectedCurrency("");
      setCurrencySymbol("");
      setShowCurrencyChoice(false);
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

  // Mutations
  const createRestaurantMutation = trpc.restaurant.create.useMutation();

  const deleteRestaurantMutation = trpc.restaurant.delete.useMutation({
    onSuccess: () => {
      toast.success(t('admin.restaurantDeleted'));
      setDeleteRestaurantId(null);
      void refetchRestaurants();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || t('admin.deleteError') || 'حدث خطأ في حذف المطعم';
      toast.error(errorMessage);
    },
  });

  const createAccountMutation = trpc.admin.createSubscriberAccount.useMutation({
    onSuccess: () => toast.success(t('admin.accountCreated')),
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setNameAr("");
    setNameEn("");
    setDescriptionAr("");
    setPhone("");
    setOwnerEmail("");
    setSubscriberPassword("");
    setSubscriberName("");
    setCreateAccount(false);
    setAddress("");
    setSelectedCountry("");
    setSelectedCurrency("");
    setCurrencySymbol("");
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRestaurant = async () => {
    if (!nameAr) {
      toast.error(t("admin.fillRestaurantNameRequired"));
      return;
    }

    setIsCreating(true);
    try {
      let subscriberUserId: number | undefined;

      if (createAccount && ownerEmail && subscriberPassword) {
        const accountResult = await createAccountMutation.mutateAsync({
          email: ownerEmail,
          password: subscriberPassword,
          name: subscriberName || nameAr,
        });
        subscriberUserId = accountResult.userId;
      }

      await createRestaurantMutation.mutateAsync({
        nameAr,
        nameEn: nameEn || undefined,
        descriptionAr: descriptionAr || undefined,
        ownerEmail: ownerEmail || undefined,
        ownerUserId: subscriberUserId,
        phone: phone || undefined,
        address: address || undefined,
        countryCode: selectedCountry || undefined,
        currencyCode: selectedCurrency || undefined,
        currencySymbol: currencySymbol || undefined,
      });

      toast.success(t('admin.restaurantCreated'));
      setShowCreateDialog(false);
      resetForm();
      void refetchRestaurants();
    } catch (err: any) {
      toast.error(err?.message || t('admin.createError'));
    } finally {
      setIsCreating(false);
    }
  };

  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    const query = searchQuery.toLowerCase().trim();
    return restaurants.filter((restaurant: any) => {
      const status = isOwnerEntitled(restaurant.ownerCommercial)
        ? ownerSubscriptionStatus(restaurant.ownerCommercial)
        : "inactive";
      const matchesSearch =
        !query ||
        (restaurant.nameAr || "").toLowerCase().includes(query) ||
        (restaurant.nameEn || "").toLowerCase().includes(query) ||
        (restaurant.ownerName || "").toLowerCase().includes(query) ||
        (restaurant.ownerEmail || "").toLowerCase().includes(query) ||
        (restaurant.phone || "").includes(query);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [restaurants, searchQuery, statusFilter]);

  const hasRestaurants = (restaurants?.length ?? 0) > 0;

  return (
    <TooltipProvider>
      <OperationsTabFrame
        listLabel={
          language === "ar"
            ? `دليل المستأجرين (${filteredRestaurants.length})`
            : `Tenant directory (${filteredRestaurants.length})`
        }
        toolbar={
          <ResponsiveOperationsBar ariaLabel={t("admin.searchPlaceholder")}>
            <div className="relative min-w-0 flex-1">
              <Search
                className="absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder={t("admin.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(adminDash.opsInput, "border-border bg-background pe-9 text-foreground")}
                aria-label={t("admin.searchPlaceholder")}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute start-2.5 top-1/2 -translate-y-1/2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={language === "ar" ? "مسح البحث" : "Clear search"}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              ) : null}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className={cn(adminDash.opsSelect, "w-full border-border bg-background sm:w-[180px]")}
                aria-label={t("admin.filterByStatus")}
              >
                <Filter className="me-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <SelectValue placeholder={t("admin.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("subscription.status.active")}</SelectItem>
                <SelectItem value="trial">{t("subscription.status.trial")}</SelectItem>
                <SelectItem value="expired">{t("subscription.status.expired")}</SelectItem>
                <SelectItem value="canceled">{t("subscription.status.canceled")}</SelectItem>
                <SelectItem value="inactive">{t("subscription.status.inactive")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
              className={cn(adminDash.opBtn, "shrink-0 text-muted-foreground")}
            >
              <Plus className="h-3.5 w-3.5 me-1" aria-hidden />
              {t("admin.addRestaurant")}
            </Button>
          </ResponsiveOperationsBar>
        }
      >
        {restaurantsLoading ? (
          <AdminLoadingState variant="cardList" rows={3} label={t("common.loading")} />
        ) : !hasRestaurants ? (
          <AdminEmptyState
            icon={Store}
            title={t("admin.noRestaurants")}
            description={t("admin.startAdding")}
            action={
              <Button
                onClick={() => {
                  resetForm();
                  setShowCreateDialog(true);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 me-2" />
                {t("admin.addFirstRestaurant")}
              </Button>
            }
          />
        ) : filteredRestaurants.length === 0 ? (
          <AdminEmptyState
            icon={Search}
            title={t("admin.noRestaurantsFiltered")}
            description={t("admin.noRestaurantsFilteredDesc")}
          />
        ) : (
          <>
            <SemanticTableDesktop>
              <SemanticTableRoot density="ops">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[28%]" />
                  <col className="w-[24%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <SemanticTableHeader density="ops" className="border-b border-border/60 bg-muted/15">
                  <SemanticTableRow density="ops">
                    <SemanticTableHead density="ops">
                      {language === "ar" ? "المستأجر" : "Tenant"}
                    </SemanticTableHead>
                    <SemanticTableHead density="ops">
                      {language === "ar" ? "حساب المالك" : "Owner account"}
                    </SemanticTableHead>
                    <SemanticTableHead density="ops">
                      {language === "ar" ? "الاشتراك" : "Subscription"}
                    </SemanticTableHead>
                    <SemanticTableHead density="ops" className="text-end">
                      {t("users.actions")}
                    </SemanticTableHead>
                  </SemanticTableRow>
                </SemanticTableHeader>
                <SemanticTableBody>
                  {filteredRestaurants.map((restaurant: any, idx: number) => {
                    const commercial = restaurant.ownerCommercial;
                    const entitled = isOwnerEntitled(commercial);
                    const status = entitled ? ownerSubscriptionStatus(commercial) : "inactive";

                    return (
                      <SemanticTableRow
                        key={restaurant.id}
                        density="ops"
                        className={cn(
                          "border-b border-border/30 last:border-b-0",
                          idx % 2 === 0 ? "bg-background/20" : "bg-transparent"
                        )}
                      >
                        <SemanticTableCell density="ops" truncate className="text-foreground">
                          <div className="truncate font-medium">{restaurant.nameAr}</div>
                          {restaurant.nameEn ? (
                            <div className="truncate text-[11px] text-muted-foreground" dir="ltr">
                              {restaurant.nameEn}
                            </div>
                          ) : null}
                        </SemanticTableCell>
                        <SemanticTableCell density="ops" truncate className="text-muted-foreground">
                          <div className="truncate">{restaurant.ownerName || "—"}</div>
                          {restaurant.ownerEmail ? (
                            <div className="truncate text-[11px]" dir="ltr" title={restaurant.ownerEmail}>
                              {restaurant.ownerEmail}
                            </div>
                          ) : null}
                        </SemanticTableCell>
                        <SemanticTableCell density="ops" truncate>
                          {entitled ? (
                            <SemanticBadge
                              tone={mapCommercialStatusToBadgeTone(status)}
                              density="outline"
                              size="sm"
                            >
                              {t(`subscription.status.${status}`)}
                            </SemanticBadge>
                          ) : (
                            <SemanticBadge tone="disabled" density="outline" size="sm">
                              {t("admin.noAccountSubscription")}
                            </SemanticBadge>
                          )}
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {entitled ? ownerPlanLabel(commercial) : "—"}
                          </div>
                        </SemanticTableCell>
                        <SemanticTableCell density="ops" actions className="text-end">
                          <SemanticTableActions>
                            <AdminActionGroup
                              compact
                              ariaLabel={t("admin.restaurantActions")}
                              primary={
                                <AdminIconButton
                                  compact
                                  label={t("admin.editRestaurant")}
                                  onClick={() =>
                                    setLocation(`/dashboard?restaurant=${restaurant.id}`)
                                  }
                                >
                                  <Edit className="h-3 w-3" />
                                </AdminIconButton>
                              }
                              danger={
                                <AdminIconButton
                                  compact
                                  label={t("admin.deleteRestaurantAction")}
                                  variant="destructive"
                                  onClick={() => setDeleteRestaurantId(restaurant.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </AdminIconButton>
                              }
                            />
                          </SemanticTableActions>
                        </SemanticTableCell>
                      </SemanticTableRow>
                    );
                  })}
                </SemanticTableBody>
              </SemanticTableRoot>
            </SemanticTableDesktop>

            <SemanticTableMobile>
            <div className="divide-y divide-border/50" role="list">
              {filteredRestaurants.map((restaurant: any) => {
                const commercial = restaurant.ownerCommercial;
                const entitled = isOwnerEntitled(commercial);
                const status = entitled ? ownerSubscriptionStatus(commercial) : "inactive";

                return (
                  <article key={restaurant.id} className={adminDash.opsListRow} role="listitem">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">
                          {restaurant.nameAr}
                        </span>
                        {entitled ? (
                          <SemanticBadge
                            tone={mapCommercialStatusToBadgeTone(status)}
                            density="outline"
                            size="sm"
                          >
                            {t(`subscription.status.${status}`)}
                          </SemanticBadge>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        {restaurant.ownerEmail ? (
                          <span dir="ltr">{restaurant.ownerEmail}</span>
                        ) : null}
                        {entitled ? <span>{ownerPlanLabel(commercial)}</span> : null}
                      </div>
                    </div>
                    <AdminActionGroup
                      compact
                      ariaLabel={t("admin.restaurantActions")}
                      primary={
                        <AdminIconButton
                          compact
                          label={t("admin.editRestaurant")}
                          onClick={() => setLocation(`/dashboard?restaurant=${restaurant.id}`)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </AdminIconButton>
                      }
                      danger={
                        <AdminIconButton
                          compact
                          label={t("admin.deleteRestaurantAction")}
                          variant="destructive"
                          onClick={() => setDeleteRestaurantId(restaurant.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </AdminIconButton>
                      }
                    />
                  </article>
                );
              })}
            </div>
            </SemanticTableMobile>
          </>
        )}
      </OperationsTabFrame>

      {/* Create Restaurant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetForm(); } }}>
        <DialogContent dir={ADMIN_WORKSPACE_DIR} className={adminDash.dialogContent}>
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('admin.addRestaurant')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{t('admin.enterRestaurantData')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground">{t('admin.restaurantNameAr')} *</Label>
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={t('admin.exampleRestaurant')}
                className="mt-1 bg-input border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground">{t('admin.restaurantNameEn')}</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Al Sharq Restaurant"
                className="mt-1 bg-input border-border text-foreground"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-foreground">{t('admin.description')}</Label>
              <Input
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                placeholder={t('admin.exampleDescription')}
                className="mt-1 bg-input border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground">{t('admin.ownerEmail')}</Label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@example.com"
                className="mt-1 bg-input border-border text-foreground"
                dir="ltr"
              />
            </div>

            {/* Create subscriber account section */}
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="createAccount"
                  checked={createAccount}
                  onCheckedChange={(checked) => setCreateAccount(!!checked)}
                />
                <Label htmlFor="createAccount" className="text-foreground flex items-center gap-2 cursor-pointer">
                  <UserPlus className="h-4 w-4" />
                  {t('admin.createLoginAccount')}
                </Label>
              </div>
              {createAccount && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-foreground">{t('admin.subscriberName')}</Label>
                    <Input
                      value={subscriberName}
                      onChange={(e) => setSubscriberName(e.target.value)}
                      placeholder={t('admin.subscriberNamePlaceholder')}
                      className="mt-1 bg-input border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">{t('admin.subscriberPassword')}</Label>
                    <Input
                      type="password"
                      value={subscriberPassword}
                      onChange={(e) => setSubscriberPassword(e.target.value)}
                      placeholder={t('admin.passwordPlaceholder')}
                      className="mt-1 bg-input border-border text-foreground"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t('admin.passwordHint')}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-foreground">{t('admin.phone')}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966..."
                className="mt-1 bg-input border-border text-foreground"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-foreground">{t('admin.address')}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('admin.exampleAddress')}
                className="mt-1 bg-input border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground">{t('dashboard.country')}</Label>
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger className="mt-1 bg-input border-border text-foreground">
                  <SelectValue placeholder={t('dashboard.selectCountry')} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-60">
                  {countries?.map((c: any) => (
                    <SelectItem key={c.countryCode} value={c.countryCode} className="text-foreground">
                      {language === 'ar' ? c.countryNameAr : c.countryNameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      : ` (${language === 'ar' ? localCurrencyNameAr || countries?.find((c: any) => c.countryCode === selectedCountry)?.currencyNameAr : localCurrencyNameEn || countries?.find((c: any) => c.countryCode === selectedCountry)?.currencyNameEn})`
                    }
                  </span>
                </div>
              </div>
            )}
            <p className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
              {t("admin.inheritedEntitlementsHint")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }} className="border-border/50 text-foreground">
              {t('admin.cancel')}
            </Button>
            <Button
              onClick={handleCreateRestaurant}
              disabled={isCreating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isCreating && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t('admin.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteRestaurantId !== null} onOpenChange={() => setDeleteRestaurantId(null)}>
        <AlertDialogContent dir={ADMIN_WORKSPACE_DIR} className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t('admin.deleteRestaurant')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">{t('admin.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50 text-foreground">{t('admin.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteRestaurantId) {
                  deleteRestaurantMutation.mutate({ id: deleteRestaurantId });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('admin.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
