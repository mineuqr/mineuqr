import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import OrderAlertSystem from "@/components/OrderAlertSystem";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { resolveImageUrl } from "@/lib/utils";
import { formatRiyadhDateTime } from "@/lib/datetime";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  QrCode, Plus, Store, LayoutGrid, UtensilsCrossed,
  BarChart3, Eye, Trash2, Pencil, ArrowRight, LogOut,
  ChevronLeft, Home, Settings, Image as ImageIcon, Loader2,
  Check, X, Upload, GripVertical, Palette, Tag, Calendar, Clock, User, Bell,
  AlertTriangle, CalendarPlus, ClipboardList, Grid3X3, Download, Copy
} from "lucide-react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { QRWithLogo } from "@/components/QRWithLogo";

// ─── Notification Badge ─────────────────────────────────────
function NotificationBadge() {
  const { data: notifications } = trpc.notification.list.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30s
  });
  const unreadCount = (notifications as any[] || []).filter((n: any) => !n.isRead).length;
  if (unreadCount === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
}

// ─── Dashboard Layout ───────────────────────────────────────

export default function Dashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { t, language, dir } = useLanguage();
  const [, setLocation] = useLocation();
  // Read restaurant ID from query parameter (used by admin panel edit button)
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantParam = urlParams.get('restaurant');
  const [activeSection, setActiveSection] = useState<"restaurants" | "restaurant-detail">(
    restaurantParam ? "restaurant-detail" : "restaurants"
  );
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(
    restaurantParam ? parseInt(restaurantParam, 10) : null
  );

  if (loading) {
    return (
      <div className="min-h-screen cinematic-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen cinematic-bg flex items-center justify-center p-4" dir={dir}>
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="p-8 text-center">
            <QrCode className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('common.loginRequired')}</h2>
            <p className="text-muted-foreground mb-6">{t('common.loginRequiredDesc')}</p>
            <Button
              onClick={() => { window.location.href = getLoginUrl(); }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full"
            >
              {t('common.login')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSelectRestaurant = (id: number) => {
    setSelectedRestaurantId(id);
    setActiveSection("restaurant-detail");
  };

  return (
    <div className="min-h-screen cinematic-bg" dir={dir}>
      {/* Order Alert System - real-time notifications */}
      <OrderAlertSystem />
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/")} className="flex items-center gap-2 hover:opacity-80 transition">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663504545475/fcy9GqTzfuy9H9eCsDbdLA/mineuqr-logo_150417d8.png"
                alt="mineuqr"
                className="h-12 w-auto object-contain"
              />
              <span className="text-lg font-bold text-foreground">mineuqr</span>
            </button>
            {activeSection === "restaurant-detail" && (
              <>
                <Separator orientation="vertical" className="h-5" />
                <button
                  onClick={() => { setActiveSection("restaurants"); setSelectedRestaurantId(null); }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('dashboard.backToRestaurants')}
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {t('common.welcome')}, {user?.name || t('dashboard.user')}
            </span>
            <Button variant="outline" size="sm" onClick={() => setLocation('/notifications')} className="border-border/50 text-foreground relative">
              <Bell className="w-4 h-4" />
              <NotificationBadge />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLocation('/profile')} className="border-border/50 text-foreground">
              <User className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">{t('profile.title')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="border-border/50 text-foreground">
              <LogOut className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">{t('dashboard.signOut')}</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container py-6">
        {activeSection === "restaurants" ? (
          <RestaurantsList onSelect={handleSelectRestaurant} />
        ) : selectedRestaurantId ? (
          <RestaurantDetail
            restaurantId={selectedRestaurantId}
            onBack={() => { setActiveSection("restaurants"); setSelectedRestaurantId(null); }}
          />
        ) : null}
      </main>
    </div>
  );
}

// ─── Restaurants List ───────────────────────────────────────

function RestaurantsList({ onSelect }: { onSelect: (id: number) => void }) {
  const { data: restaurants, isLoading, refetch } = trpc.restaurant.list.useQuery();
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteRestaurantId, setDeleteRestaurantId] = useState<number | null>(null);
  
  const deleteRestaurantMutation = trpc.restaurant.delete.useMutation({
    onSuccess: () => {
      toast.success(t('dashboard.restaurantDeleted'));
      setDeleteRestaurantId(null);
      refetch();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || t('dashboard.deleteError') || 'حدث خطأ في حذف المطعم';
      toast.error(errorMessage);
    },
  });
  
  const handleDeleteRestaurant = () => {
    if (deleteRestaurantId) {
      deleteRestaurantMutation.mutate({ id: deleteRestaurantId });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('dashboard.myRestaurants')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('dashboard.myRestaurantsDesc')}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 ml-1" />
          {t('dashboard.addRestaurant')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !restaurants?.length ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">{t('dashboard.noRestaurants')}</h3>
            <p className="text-muted-foreground mb-6">{t('dashboard.noRestaurantsDesc')}</p>
            <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 ml-1" />
              {t('dashboard.addNewRestaurant')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((r) => (
            <Card
              key={r.id}
              className="bg-card border-border hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => onSelect(r.id)}
            >
              <CardContent className="p-5">
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
      
      <AlertDialog open={deleteRestaurantId !== null} onOpenChange={(open) => !open && setDeleteRestaurantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.deleteRestaurant')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.deleteRestaurantConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRestaurant}
              disabled={deleteRestaurantMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteRestaurantMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    onError: (err) => toast.error(err.message || t('dashboard.errorOccurred')),
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

// ─── Restaurant Detail ──────────────────────────────────────

function RestaurantDetail({ restaurantId, onBack }: { restaurantId: number; onBack: () => void }) {
  const { t, language } = useLanguage();
  const { data: restaurant, isLoading } = trpc.restaurant.getById.useQuery({ id: restaurantId });
  const { data: stats } = trpc.restaurant.stats.useQuery({ id: restaurantId });
  const { data: categoriesList, isLoading: catsLoading } = trpc.category.list.useQuery(
    { restaurantId },
    { enabled: !!restaurantId }
  );
  const { data: subscriptionData } = trpc.subscription.getByRestaurant.useQuery(
    { restaurantId },
    { enabled: !!restaurantId }
  );
  const [activeTab, setActiveTab] = useState<"categories" | "offers" | "orders" | "tables" | "qr" | "templates" | "settings">("categories");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Check subscription expiry warning
  const subscriptionWarning = useMemo(() => {
    if (!subscriptionData?.subscription) return null;
    const sub = subscriptionData.subscription;
    if (sub.status !== 'active' && sub.status !== 'trial') return null;
    const endDateStr = sub.status === 'trial' ? (sub.trialEndsAt || sub.currentPeriodEnd) : sub.currentPeriodEnd;
    if (!endDateStr) return null;
    const endDate = new Date(endDateStr);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { type: 'expired' as const, daysLeft: 0 };
    if (daysLeft <= 7) return { type: 'warning' as const, daysLeft };
    return null;
  }, [subscriptionData]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!restaurant) {
    return <div className="text-center py-20 text-muted-foreground">{t('dashboard.restaurantNotFound')}</div>;
  }

  const tabs = [
    { id: "categories" as const, label: t('dashboard.categoriesAndItems'), icon: LayoutGrid },
    { id: "offers" as const, label: t('dashboard.offers'), icon: Tag },
    { id: "orders" as const, label: language === 'ar' ? 'الطلبات' : 'Orders', icon: ClipboardList },
    { id: "tables" as const, label: language === 'ar' ? (restaurant?.tableLabel === 'rooms' ? 'الغرف' : 'الطاولات') : (restaurant?.tableLabel === 'rooms' ? 'Rooms' : 'Tables'), icon: Grid3X3 },
    { id: "qr" as const, label: t('dashboard.qrCode'), icon: QrCode },
    { id: "templates" as const, label: t('dashboard.templates'), icon: Palette },
    { id: "settings" as const, label: t('dashboard.settings'), icon: Settings },
  ];

  return (
    <div>
      {/* Subscription Warning Banner */}
      {subscriptionWarning && (
        <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 ${
          subscriptionWarning.type === 'expired'
            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
            : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
        }`}>
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

      {/* Restaurant Header */}
      <div className="cinematic-card rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {resolveImageUrl(restaurant.logoUrl) ? (
            <img src={resolveImageUrl(restaurant.logoUrl)} alt="" className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Store className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{restaurant.nameAr}</h1>
            {restaurant.nameEn && <p className="text-muted-foreground">{restaurant.nameEn}</p>}
            {restaurant.descriptionAr && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{restaurant.descriptionAr}</p>}
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats?.totalCategories ?? 0}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.category')}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-accent">{stats?.totalItems ?? 0}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.item')}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.viewCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.visit')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-secondary/30 rounded-lg p-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "categories" && (
        <CategoriesTab
          restaurantId={restaurantId}
          categories={categoriesList || []}
          isLoading={catsLoading}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          currencySymbol={(restaurant as any)?.currencySymbol}
        />
      )}
      {activeTab === "offers" && <OffersTab restaurantId={restaurantId} currencySymbol={(restaurant as any)?.currencySymbol} />}
      {activeTab === "orders" && <OrdersTab restaurantId={restaurantId} currencySymbol={(restaurant as any)?.currencySymbol} tableLabel={(restaurant as any)?.tableLabel} />}
      {activeTab === "tables" && <TablesTab restaurantId={restaurantId} restaurant={restaurant} />}
      {activeTab === "qr" && <QRTab restaurant={restaurant} />}
      {activeTab === "templates" && (
        <div className="text-center py-12">
          <Palette className="w-16 h-16 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">{t('dashboard.templateDesign')}</h3>
          <p className="text-muted-foreground mb-6">{t('dashboard.chooseTemplate')}</p>
          <a href={`/dashboard/templates/${restaurantId}`}>
            <Button className="bg-primary hover:bg-primary/90">
              <Palette className="w-4 h-4 ml-2" />
              {t('dashboard.selectTemplateBtn')}
            </Button>
          </a>
        </div>
      )}
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
    onError: (err) => toast.error(err.message),
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
        <Card className="bg-card border-border">
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
              className="bg-card border-border hover:border-primary/30 transition cursor-pointer group"
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

      <AlertDialog open={!!deleteCatId} onOpenChange={(v) => { if (!v) setDeleteCatId(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t('dashboard.deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t('dashboard.deleteCategoryConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-border text-foreground">{t('dashboard.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCatId && deleteCatMutation.mutate({ id: deleteCatId })}
              className="bg-destructive text-destructive-foreground"
            >
              {t('dashboard.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.category.update.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      toast.success(t('dashboard.updateCategorySuccess'));
      onClose();
    },
    onError: (err) => toast.error(err.message),
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
  const { data: items, isLoading } = trpc.menuItem.listByCategory.useQuery({ categoryId });
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
    onError: (err) => toast.error(err.message),
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
        <Card className="bg-card border-border">
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
            <Card key={item.id} className="bg-card border-border">
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

      <AlertDialog open={!!deleteItemId} onOpenChange={(v) => { if (!v) setDeleteItemId(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t('dashboard.deleteItem')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">{t('dashboard.deleteItemConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-border text-foreground">{t('dashboard.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemId && deleteItemMutation.mutate({ id: deleteItemId })}
              className="bg-destructive text-destructive-foreground"
            >
              {t('dashboard.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      toast.error(err instanceof Error ? err.message : String(err));
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
      <Card className="bg-card border-border">
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
      <Card className="bg-card border-border">
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
      <Card className="bg-card border-border">
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
        <Card className="bg-card border-border">
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
        <Card className="bg-card border-border">
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
  const { data: offers, isLoading } = trpc.offer.list.useQuery({ restaurantId });
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const OFFER_TYPE_LABELS: Record<string, string> = {
    daily: t('dashboard.daily'),
    weekly: t('dashboard.weekly'),
    monthly: t('dashboard.monthly'),
  };

  const OFFER_TYPE_COLORS: Record<string, string> = {
    daily: "bg-red-500/10 text-red-500 border-red-500/20",
    weekly: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    monthly: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
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
        <div className="text-center py-16 cinematic-card rounded-xl">
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
                    {resolveImageUrl(offer.imageUrl) && (
                      <img src={resolveImageUrl(offer.imageUrl)} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{offer.titleAr}</h3>
                        <Badge variant="outline" className={OFFER_TYPE_COLORS[offer.offerType]}>
                          {OFFER_TYPE_LABELS[offer.offerType]}
                        </Badge>
                        {isExpired && <Badge variant="destructive" className="text-xs">{t('dashboard.expired')}</Badge>}
                        {isUpcoming && <Badge variant="secondary" className="text-xs">{t('dashboard.upcoming')}</Badge>}
                        {!isExpired && !isUpcoming && offer.isActive && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{t('dashboard.active')}</Badge>}
                      </div>
                      {offer.descriptionAr && <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{offer.descriptionAr}</p>}
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">{offer.offerPrice} {currencySymbol || t('dashboard.sar')}</span>
                        <span className="text-sm text-muted-foreground line-through">{offer.originalPrice} {currencySymbol || t('dashboard.sar')}</span>
                        {discount > 0 && <Badge className="bg-red-500 text-white text-xs">-{discount}%</Badge>}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(offer.startDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </span>
                        <span>→</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(offer.endDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.deleteOfferConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('dashboard.deleteOfferConfirmMessage')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dashboard.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              {t('dashboard.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const [imageUrl, setImageUrl] = useState(offer?.imageUrl || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const OFFER_TYPE_LABELS: Record<string, string> = {
    daily: t('dashboard.daily'),
    weekly: t('dashboard.weekly'),
    monthly: t('dashboard.monthly'),
  };

  const OFFER_TYPE_COLORS: Record<string, string> = {
    daily: "bg-red-500/10 text-red-500 border-red-500/20",
    weekly: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    monthly: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };

  const createMutation = trpc.offer.create.useMutation({
    onSuccess: () => {
      utils.offer.list.invalidate({ restaurantId });
      toast.success(t('dashboard.addOfferSuccess'));
      onClose();
    },
    onError: () => toast.error(t('dashboard.addOfferError')),
  });

  const updateMutation = trpc.offer.update.useMutation({
    onSuccess: () => {
      utils.offer.list.invalidate({ restaurantId });
      toast.success(t('dashboard.updateOfferSuccess'));
      onClose();
    },
    onError: () => toast.error(t('dashboard.updateOfferError')),
  });

  const uploadMutation = trpc.offer.uploadImage.useMutation({
    onSuccess: (data) => {
      setImageUrl(data.url);
      setUploading(false);
      toast.success(t('dashboard.uploadSuccess'));
    },
    onError: () => {
      setUploading(false);
      toast.error(t('dashboard.uploadError'));
    },
  });

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !offer?.id) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        offerId: offer.id,
        imageData: base64,
        fileName: file.name,
        contentType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }, [offer?.id]);

  const handleSubmit = () => {
    if (!titleAr || !originalPrice || !offerPrice || !startDate || !endDate) {
      toast.error(t('dashboard.fillAllFields'));
      return;
    }
    if (offer) {
      updateMutation.mutate({
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
        imageUrl: imageUrl || undefined,
      });
    } else {
      createMutation.mutate({
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
        imageUrl: imageUrl || undefined,
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Auto-set end date based on offer type
  useEffect(() => {
    if (!offer && startDate && offerType) {
      const start = new Date(startDate);
      let end = new Date(start);
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
          {/* Offer Type */}
          <div>
            <Label>{t('dashboard.offerType')}</Label>
            <div className="flex gap-2 mt-1">
              {(["daily", "weekly", "monthly"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setOfferType(type)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                    offerType === type
                      ? OFFER_TYPE_COLORS[type] + " border-current"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {OFFER_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
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

          {/* Description */}
          <div>
            <Label>{t('dashboard.offerDescriptionAr')}</Label>
            <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} placeholder={t('dashboard.exampleDescription')} className="mt-1" rows={2} />
          </div>

          {/* Prices */}
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

          {/* Dates */}
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

          {/* Image Upload (only for existing offers) */}
          {offer && (
            <div>
              <Label>{t('dashboard.uploadOfferImage')}</Label>
              <div className="mt-1 flex items-center gap-3">
                {resolveImageUrl(imageUrl) ? (
                  <img src={resolveImageUrl(imageUrl)} alt="" className="w-20 h-20 rounded-lg object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
                    {uploading ? t('dashboard.uploading') : t('dashboard.uploadImage')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('dashboard.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
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
  const { t } = useLanguage();
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

  const { data: holidays, refetch: refetchHolidays } = trpc.holiday.list.useQuery({ restaurantId: restaurant.id });
  const createHolidayMut = trpc.holiday.create.useMutation({ onSuccess: () => { refetchHolidays(); setShowAddHoliday(false); setHolidayTitleAr(''); setHolidayTitleEn(''); setHolidayDate(''); setHolidayFullDay(true); } });
  const deleteHolidayMut = trpc.holiday.delete.useMutation({ onSuccess: () => refetchHolidays() });

  const { data: countries } = trpc.countryCurrency.getAll.useQuery();
  const { language } = useLanguage();

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
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.restaurant.delete.useMutation({
    onSuccess: () => {
      utils.restaurant.list.invalidate();
      toast.success(t('dashboard.deleteRestaurantSuccess'));
      onBack();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadImageMutation = trpc.restaurant.uploadImage.useMutation({
    onSuccess: () => {
      utils.restaurant.getById.invalidate();
      utils.restaurant.list.invalidate();
      toast.success(t('dashboard.uploadSuccess'));
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteImageMutation = trpc.restaurant.deleteImage.useMutation({
    onSuccess: () => {
      utils.restaurant.getById.invalidate();
      utils.restaurant.list.invalidate();
      toast.success(t('dashboard.deleteImageSuccess'));
    },
    onError: (err: any) => toast.error(err.message),
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Images */}
      <Card className="bg-card border-border">
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
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t('dashboard.restaurantData')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground">{t('dashboard.restaurantNameAr')}</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="mt-1 bg-input border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground">{t('dashboard.restaurantNameEn')}</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="mt-1 bg-input border-border text-foreground" dir="ltr" />
            </div>
          </div>
          <div>
            <Label className="text-foreground">{t('dashboard.descriptionAr2')}</Label>
            <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} className="mt-1 bg-input border-border text-foreground" rows={3} />
          </div>
          <div>
            <Label className="text-foreground">{t('dashboard.descriptionEn')}</Label>
            <Textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} className="mt-1 bg-input border-border text-foreground" rows={3} dir="ltr" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground">{t('dashboard.phone')}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 bg-input border-border text-foreground" dir="ltr" />
            </div>
            <div>
              <Label className="text-foreground">{t('dashboard.address')}</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 bg-input border-border text-foreground" />
            </div>
          </div>

          {/* Social Media Links */}
          <div className="border-t border-border pt-4 mt-4">
            <Label className="text-foreground font-bold text-base mb-3 block">{t('dashboard.socialLinks')}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-sm">{t('dashboard.whatsapp')}</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="966501234567" className="mt-1 bg-input border-border text-foreground" dir="ltr" />
              </div>
              <div>
                <Label className="text-foreground text-sm">{t('dashboard.instagram')}</Label>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="restaurant_name" className="mt-1 bg-input border-border text-foreground" dir="ltr" />
              </div>
              <div>
                <Label className="text-foreground text-sm">{t('dashboard.snapchat')}</Label>
                <Input value={snapchat} onChange={(e) => setSnapchat(e.target.value)} placeholder="restaurant_snap" className="mt-1 bg-input border-border text-foreground" dir="ltr" />
              </div>
              <div>
                <Label className="text-foreground text-sm">{t('dashboard.xTwitter')}</Label>
                <Input value={xTwitter} onChange={(e) => setXTwitter(e.target.value)} placeholder="restaurant_x" className="mt-1 bg-input border-border text-foreground" dir="ltr" />
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-foreground text-sm">{t('dashboard.locationUrl')}</Label>
              <Input value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} placeholder="https://maps.google.com/..." className="mt-1 bg-input border-border text-foreground" dir="ltr" />
            </div>
          </div>

          {/* Working Hours */}
          <div className="border-t border-border pt-4 mt-4">
            <Label className="text-foreground font-bold text-base mb-3 block">{t('dashboard.workingHours')}</Label>
            <div className="space-y-2">
              {(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const).map((day) => (
                <div key={day} className="flex items-center gap-2 sm:gap-3">
                  <span className="text-foreground text-sm w-20 sm:w-24 shrink-0">{t(`dashboard.days.${day}`)}</span>
                  <Switch
                    checked={!workingHours[day]?.closed}
                    onCheckedChange={(checked) => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], closed: !checked } }))}
                  />
                  {!workingHours[day]?.closed ? (
                    <div className="flex items-center gap-1 sm:gap-2 flex-1">
                      <Input
                        type="time"
                        value={workingHours[day]?.open || '09:00'}
                        onChange={(e) => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }))}
                        className="bg-input border-border text-foreground text-sm h-8 w-24 sm:w-28"
                        dir="ltr"
                      />
                      <span className="text-muted-foreground text-xs">-</span>
                      <Input
                        type="time"
                        value={workingHours[day]?.close || '23:00'}
                        onChange={(e) => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }))}
                        className="bg-input border-border text-foreground text-sm h-8 w-24 sm:w-28"
                        dir="ltr"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">{t('dashboard.closed')}</span>
                  )}
                </div>
              ))}
            </div>
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
            onClick={() => updateMutation.mutate({
              id: restaurant.id, nameAr, nameEn: nameEn || undefined,
              descriptionAr: descriptionAr || undefined, descriptionEn: descriptionEn || undefined,
              phone: phone || undefined, address: address || undefined, isActive,
              countryCode: selectedCountry || undefined, currencyCode: selectedCurrency || undefined,
              currencySymbol: currencySymbol || undefined,
              whatsapp: whatsapp || null,
              snapchat: snapchat || null,
              instagram: instagram || null,
              xTwitter: xTwitter || null,
              locationUrl: locationUrl || null,
              workingHours: JSON.stringify(workingHours),
              temporaryClosure: JSON.stringify({ active: tempClosed, message: tempClosedMsg }),
              tableLabel,
            })}
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('dashboard.save')}
          </Button>
        </CardContent>
      </Card>

      {/* Temporary Closure */}
      <Card className={`bg-card border-border ${tempClosed ? 'border-amber-500/50' : ''}`}>
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
      <Card className="bg-card border-border">
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
                const isPast = h.date < new Date().toISOString().split('T')[0];
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
      <Card className="bg-card border-destructive/30">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-destructive mb-2">{t('dashboard.dangerZone')}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('dashboard.dangerZoneDescription')}</p>
          <Button variant="outline" onClick={() => setShowDelete(true)} className="border-destructive/50 text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 ml-1" />
            {t('dashboard.deleteRestaurant')}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t('dashboard.deleteForever')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t('dashboard.deleteForeverConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-border text-foreground">{t('dashboard.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: restaurant.id })}
              className="bg-destructive text-destructive-foreground"
            >
              {t('dashboard.deleteForever')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


// ─── Orders Tab ─────────────────────────────────────────────
function OrdersTab({ restaurantId, currencySymbol, tableLabel }: { restaurantId: number; currencySymbol?: string; tableLabel?: string }) {
  const { t, language } = useLanguage();
  const isRooms = tableLabel === 'rooms';
  const unitAr = isRooms ? 'غرفة' : 'طاولة';
  const unitEn = isRooms ? 'Room' : 'Table';
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: orders, refetch } = trpc.order.list.useQuery(
    { restaurantId, status: statusFilter === "all" ? undefined : statusFilter },
    { refetchInterval: 5000 }
  );

  // Sound notification for new orders
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIj2markup");
      // Use a simple beep sound
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      audioRef.current = { play: () => {
        const ctx2 = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx2.createOscillator();
        const gain = ctx2.createGain();
        osc.connect(gain);
        gain.connect(ctx2.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.3;
        osc.start();
        setTimeout(() => { osc.stop(); ctx2.close(); }, 300);
      }} as any;
    }
  }, []);

  useEffect(() => {
    if (orders && orders.length > lastOrderCount && lastOrderCount > 0) {
      // New order arrived!
      audioRef.current?.play?.();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(language === 'ar' ? '🍽️ طلب جديد!' : '🍽️ New Order!', {
          body: language === 'ar' ? `طلب جديد على الطاولة` : `New order received`,
        });
      }
    }
    if (orders) setLastOrderCount(orders.length);
  }, [orders?.length]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    preparing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    ready: "bg-green-500/20 text-green-400 border-green-500/30",
    served: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const statusLabels: Record<string, { ar: string; en: string }> = {
    pending: { ar: "قيد الانتظار", en: "Pending" },
    preparing: { ar: "قيد التحضير", en: "Preparing" },
    ready: { ar: "جاهز", en: "Ready" },
    served: { ar: "تم التقديم", en: "Served" },
    cancelled: { ar: "ملغي", en: "Cancelled" },
  };

  const updateStatusMutation = trpc.order.updateStatus.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {["all", "pending", "preparing", "ready", "served", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === status
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {status === "all"
              ? (language === "ar" ? "الكل" : "All")
              : (language === "ar" ? statusLabels[status]?.ar : statusLabels[status]?.en)}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {!orders || orders.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {language === "ar" ? "لا توجد طلبات" : "No orders yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <Card key={order.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-primary">#{order.orderNumber}</span>
                    <Badge className={`${statusColors[order.status]} border text-xs`}>
                      {language === "ar" ? statusLabels[order.status]?.ar : statusLabels[order.status]?.en}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {language === "ar" ? `${unitAr} ${order.tableNumber}` : `${unitEn} ${order.tableNumber}`}
                  </span>
                </div>

                {order.customerName && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <User className="w-3.5 h-3.5 inline ml-1" />
                    {order.customerName}
                  </p>
                )}

                {order.customerPhone && (
                  <p className="text-sm text-muted-foreground mb-1">
                    {order.customerPhone}
                  </p>
                )}

                {order.notes && (
                  <p className="text-xs text-muted-foreground mb-2 italic">
                    {order.notes}
                  </p>
                )}

                {Array.isArray(order.items) && order.items.length > 0 && (
                  <ul className="mt-2 mb-3 space-y-1 border-t border-border/40 pt-2">
                    {order.items.map((line: any) => (
                      <li
                        key={line.id}
                        className="flex items-center justify-between text-sm gap-2"
                      >
                        <span className="text-foreground">
                          {language === "ar"
                            ? line.nameAr
                            : line.nameEn || line.nameAr}
                          <span className="text-muted-foreground"> ×{line.quantity}</span>
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {(parseFloat(line.price) * line.quantity).toFixed(2)}{" "}
                          {currencySymbol || "ر.س"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-foreground">
                    {order.totalAmount} {currencySymbol || "ر.س"}
                  </span>
                  <div className="flex gap-1">
                    {order.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: "preparing" })}
                        >
                          {language === "ar" ? "تحضير" : "Prepare"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-red-500/50 text-red-400 hover:bg-red-500/10"
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: "cancelled" })}
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
                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: "ready" })}
                      >
                        {language === "ar" ? "جاهز" : "Ready"}
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: "served" })}
                      >
                        {language === "ar" ? "تم التقديم" : "Served"}
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tables Tab ─────────────────────────────────────────────
function TablesTab({ restaurantId, restaurant }: { restaurantId: number; restaurant: any }) {
  const { t, language } = useLanguage();
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

  const { data: tables, refetch } = trpc.table.list.useQuery({ restaurantId });
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
      <Card className="border-border/50">
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
      <Card className="border-border/50">
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
        <Card className="border-border/50">
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
    <div className="relative bg-card border border-border/50 rounded-xl p-4 text-center group hover:border-primary/50 transition-colors">
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
