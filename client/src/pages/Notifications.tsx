import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, AlertCircle, RefreshCw, Filter, BellRing, Clock, CreditCard, PlusCircle, Edit, Trash2, ShieldCheck, ArrowRight, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { formatRiyadhDate, formatRiyadhTime } from "@/lib/datetime";

export default function Notifications() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === "ar" ? "ar-SA" : "en-US";
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications, isLoading, error, refetch } = trpc.notification.list.useQuery(undefined, {
    enabled: !!user,
  });

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success(t("notifications.markedAsRead") || "تم التعيين كمقروء");
    },
  });

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsReadMutation.mutateAsync({ id });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    const notifArr = notifications as any[];
    if (filter === "unread") return notifArr.filter((n) => !n.isRead);
    return notifArr;
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    if (!notifications) return 0;
    return (notifications as any[]).filter((n) => !n.isRead).length;
  }, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "7_days_before":
      case "1_day_before":
        return <Clock className="h-5 w-5 text-yellow-400" />;
      case "on_renewal":
        return <RefreshCw className="h-5 w-5 text-blue-400" />;
      case "failed_renewal":
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case "subscription_created":
        return <PlusCircle className="h-5 w-5 text-green-400" />;
      case "subscription_updated":
        return <Edit className="h-5 w-5 text-blue-400" />;
      case "subscription_deleted":
        return <Trash2 className="h-5 w-5 text-red-400" />;
      case "subscription_activated":
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case "role_changed":
        return <ShieldCheck className="h-5 w-5 text-purple-400" />;
      case "custom_message":
        return <BellRing className="h-5 w-5 text-amber-400" />;
      case "new_order":
        return <ShoppingCart className="h-5 w-5 text-orange-400" />;
      default:
        return <BellRing className="h-5 w-5 text-cyan-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "7_days_before":
      case "1_day_before":
        return "bg-yellow-500/10 border-yellow-500/20";
      case "failed_renewal":
      case "subscription_deleted":
        return "bg-red-500/10 border-red-500/20";
      case "subscription_created":
      case "subscription_activated":
        return "bg-green-500/10 border-green-500/20";
      case "subscription_updated":
      case "on_renewal":
        return "bg-blue-500/10 border-blue-500/20";
      case "role_changed":
        return "bg-purple-500/10 border-purple-500/20";
      case "custom_message":
        return "bg-amber-500/10 border-amber-500/20";
      case "new_order":
        return "bg-orange-500/10 border-orange-500/20";
      default:
        return "bg-cyan-500/10 border-cyan-500/20";
    }
  };

  const getNotificationTitle = (type: string) => {
    const titles: Record<string, string> = {
      "7_days_before": "تذكير بالتجديد - 7 أيام",
      "1_day_before": "تذكير بالتجديد - يوم واحد",
      "on_renewal": "تم التجديد",
      "failed_renewal": "فشل التجديد",
      "subscription_created": "اشتراك جديد",
      "subscription_updated": "تعديل الاشتراك",
      "subscription_deleted": "إلغاء الاشتراك",
      "subscription_activated": "تفعيل الاشتراك",
      "role_changed": "تغيير الصلاحيات",
      "custom_message": "رسالة من الإدارة",
      "new_order": "طلب جديد",
    };
    return t(`notifications.type.${type}`) || titles[type] || type;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader>
            <CardTitle>{t("notifications.title") || "الإشعارات"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t("notifications.loginRequired") || "يجب تسجيل الدخول لعرض الإشعارات"}
            </p>
            <Link href="/dashboard">
              <Button className="w-full">{t("common.dashboard") || "لوحة التحكم"}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white">{t("common.loading") || "جاري التحميل..."}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md border-destructive bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {t("common.error") || "خطأ"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="page-heading text-3xl font-bold text-white mb-1">{t("notifications.title") || "الإشعارات"}</h1>
              <p className="ui-chrome text-cyan-300 text-sm">{t("notifications.description") || "تابع آخر التحديثات على اشتراكك"}</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-lg px-3 py-1">
              {unreadCount} {t("notifications.unread") || "غير مقروء"}
            </Badge>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
          >
            {t("notifications.all") || "الكل"}
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
            className={filter === "unread" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
          >
            {t("notifications.unread") || "غير مقروء"} ({unreadCount})
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="pt-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">{t("notifications.noNotifications") || "لا توجد إشعارات حالياً"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification: any) => (
              <Card
                key={notification.id}
                className={`bg-card border-border hover:shadow-lg transition-all ${
                  !notification.isRead ? "border-l-4 border-l-cyan-400" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getNotificationColor(notification.notificationType)}`}>
                        {getNotificationIcon(notification.notificationType)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg text-foreground flex items-center gap-2">
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shrink-0"></div>
                          )}
                          {getNotificationTitle(notification.notificationType)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {formatRiyadhDate(notification.createdAt, dateLocale)} - {formatRiyadhTime(notification.createdAt, dateLocale)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        !notification.isRead
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {notification.isRead ? (t("notifications.read") || "مقروء") : (t("notifications.unread") || "غير مقروء")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {notification.message && (
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{notification.message}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        className="gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {t("notifications.markAsRead") || "تعيين كمقروء"}
                      </Button>
                    )}
                    {(notification.notificationType === "7_days_before" || 
                      notification.notificationType === "1_day_before" || 
                      notification.notificationType === "failed_renewal" ||
                      notification.notificationType === "subscription_deleted") && (
                      <Link href="/pricing">
                        <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 gap-2">
                          <RefreshCw className="h-4 w-4" />
                          {t("notifications.renewNow") || "تجديد الآن"}
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
