import { useState, useMemo } from "react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Loader2, Store, UserPlus, Key, Search, Filter, X, Bell, Send, Users, FileText, Download } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { SubscriptionAdminFormFields } from "@/components/admin/subscription/SubscriptionAdminFormFields";
import {
  AdminKPISection,
  AdminOperationsSection,
  AdminOperationsShell,
  AdminSection,
  adminActionBtn,
  adminDash,
} from "@/components/admin/layout";
import {
  AdminActionGroup,
  AdminEmptyState,
  AdminIconButton,
  AdminLoadingState,
  ResponsiveOperationsBar,
} from "@/components/admin/operations";
import { mapDashboardSummaryToKPIs } from "@/lib/admin/dashboardSummaryKpis";
import {
  isOwnerEntitled,
  ownerPlanLabel,
  ownerSubscriptionStatus,
} from "@/lib/admin/ownerCommercialDisplay";
import { formatSubscriptionEndDate } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { isProtectedUserId } from "@shared/const";
import {
  ACCOUNT_CLASSIFICATIONS,
  INTERNAL_STAFF_CATEGORIES,
  type AccountClassification,
  type InternalStaffCategory,
} from "@shared/accountClassification";
import { accountClassificationLabel } from "@/lib/admin/accountClassificationDisplay";

// ─── Users Section Component ───────────────────────────────────────
function UsersSection() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<AccountClassification | "all">("all");
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<"admin" | "user">("user");
  const [editingClassification, setEditingClassification] =
    useState<AccountClassification>("COMMERCIAL");
  const [internalUserDialogOpen, setInternalUserDialogOpen] = useState(false);
  const [internalName, setInternalName] = useState("");
  const [internalEmail, setInternalEmail] = useState("");
  const [internalPassword, setInternalPassword] = useState("");
  const [internalRole, setInternalRole] = useState<"admin" | "user">("user");
  const [internalStaffCategory, setInternalStaffCategory] =
    useState<InternalStaffCategory>("support");
  const [subDialogUser, setSubDialogUser] = useState<any>(null);
  const [subDialogMode, setSubDialogMode] = useState<"create" | "edit">("create");
  const [subPlanId, setSubPlanId] = useState<string>("");
  const [subBillingCycle, setSubBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [subStatus, setSubStatus] = useState<"active" | "canceled" | "expired" | "trial">("active");
  const [subEndDate, setSubEndDate] = useState("");
  const [deleteSubUserId, setDeleteSubUserId] = useState<number | null>(null);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyUserId, setNotifyUserId] = useState<number | null>(null);
  const [notifyUserName, setNotifyUserName] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [bulkNotifyDialogOpen, setBulkNotifyDialogOpen] = useState(false);
  const [bulkNotifyMessage, setBulkNotifyMessage] = useState("");

  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } =
    trpc.admin.getOwnerOverviewList.useQuery({
      limit: 500,
      classificationFilter: classificationFilter === "all" ? undefined : classificationFilter,
    });
  const { data: restaurantListData, refetch: refetchRestaurantList } =
    trpc.admin.listRestaurants.useQuery();
  const { data: plans } = trpc.subscription.listPlans.useQuery();

  const allUsers = useMemo(() => {
    const restaurantsByUser = new Map<number, { id: number }[]>();
    for (const item of restaurantListData?.items ?? []) {
      const uid = item.restaurant.userId;
      if (!restaurantsByUser.has(uid)) restaurantsByUser.set(uid, []);
      restaurantsByUser.get(uid)!.push({ id: item.restaurant.id });
    }
    return (overviewData?.items ?? []).map((item) => ({
      ...item.owner,
      commercial: item.commercial,
      restaurants: restaurantsByUser.get(item.owner.id) ?? [],
    }));
  }, [overviewData, restaurantListData]);

  const refetchUsers = () => {
    void refetchOverview();
    void refetchRestaurantList();
  };

  const usersLoading = overviewLoading;

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success(t('users.roleUpdated') || 'تم تحديث الدور');
      setEditingUserId(null);
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const updateClassificationMutation = trpc.admin.updateAccountClassification.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم تحديث التصنيف" : "Classification updated");
      setEditingUserId(null);
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const createInternalUserMutation = trpc.admin.createInternalUser.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم إنشاء حساب داخلي" : "Internal user created");
      setInternalUserDialogOpen(false);
      setInternalName("");
      setInternalEmail("");
      setInternalPassword("");
      setInternalRole("user");
      setInternalStaffCategory("support");
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success(t('users.userDeleted') || 'تم حذف المستخدم');
      setDeleteUserId(null);
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const createSubMutation = trpc.admin.createUserSubscriptionByAdmin.useMutation({
    onSuccess: () => {
      toast.success('تم إنشاء الاشتراك بنجاح');
      setSubDialogUser(null);
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ');
    },
  });

  const updateSubMutation = trpc.admin.updateUserSubscriptionByAdmin.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث الاشتراك بنجاح');
      setSubDialogUser(null);
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ');
    },
  });

  const deleteSubMutation = trpc.admin.deleteUserSubscriptionByAdmin.useMutation({
    onSuccess: () => {
      toast.success('تم حذف الاشتراك بنجاح');
      setDeleteSubUserId(null);
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ');
    },
  });

  const sendNotifyMutation = trpc.admin.sendCustomNotification.useMutation({
    onSuccess: () => {
      toast.success('تم إرسال الإشعار بنجاح');
      setNotifyDialogOpen(false);
      setNotifyMessage("");
      setNotifyUserId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ في إرسال الإشعار');
    },
  });

  const generateInvoiceMutation = trpc.admin.generateInvoicePDF.useMutation({
    onSuccess: (data: any) => {
      toast.success('تم إنشاء الفاتورة بنجاح');
      if (data.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      }
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ في إنشاء الفاتورة');
    },
  });

  const sendBulkNotifyMutation = trpc.admin.sendBulkNotification.useMutation({
    onSuccess: (data: any) => {
      toast.success(`تم إرسال الإشعار إلى ${data.sentCount} مستخدم`);
      setBulkNotifyDialogOpen(false);
      setBulkNotifyMessage("");
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ في إرسال الإشعارات');
    },
  });

  const openNotifyDialog = (userId: number, userName: string) => {
    setNotifyUserId(userId);
    setNotifyUserName(userName);
    setNotifyMessage("");
    setNotifyDialogOpen(true);
  };

  const filteredUsers = allUsers?.filter((u: any) =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const openCreateSubDialog = (u: any) => {
    setSubDialogUser(u);
    setSubDialogMode("create");
    setSubPlanId("");
    setSubBillingCycle("monthly");
    setSubStatus("active");
    setSubEndDate("");
  };

  const openEditSubDialog = (u: any) => {
    setSubDialogUser(u);
    setSubDialogMode("edit");
    const c = u.commercial;
    setSubPlanId(c?.planId?.toString() || "");
    setSubBillingCycle(c?.billingCycle || "monthly");
    setSubStatus(c?.subscriptionStatus || "active");
    setSubEndDate(c?.currentPeriodEnd ? c.currentPeriodEnd.split("T")[0] : "");
  };

  const handleSubSubmit = () => {
    if (!subDialogUser) return;
    if (subDialogMode === "create") {
      if (!subPlanId) { toast.error('يرجى اختيار باقة'); return; }
      createSubMutation.mutate({
        userId: subDialogUser.id,
        planId: parseInt(subPlanId),
        billingCycle: subBillingCycle,
        status: subStatus,
        subscriptionEndDate: subEndDate || undefined,
      });
    } else {
      updateSubMutation.mutate({
        userId: subDialogUser.id,
        planId: subPlanId ? parseInt(subPlanId) : undefined,
        billingCycle: subBillingCycle,
        status: subStatus,
        subscriptionEndDate: subEndDate || undefined,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-600 text-white text-xs">فعال</Badge>;
      case 'trial': return <Badge className="bg-blue-600 text-white text-xs">تجريبي</Badge>;
      case 'expired': return <Badge className="bg-red-600 text-white text-xs">منتهي</Badge>;
      case 'canceled': return <Badge className="bg-gray-600 text-white text-xs">ملغي</Badge>;
      default: return <Badge variant="secondary" className="text-xs">بدون اشتراك</Badge>;
    }
  };

  const renderUserActions = (u: any) => {
    if (editingUserId === u.id) {
      return (
        <AdminActionGroup
          ariaLabel={t("admin.userActions")}
          primary={
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  const tasks: Promise<unknown>[] = [];
                  if (editingRole !== u.role) {
                    tasks.push(
                      updateRoleMutation.mutateAsync({ userId: u.id, role: editingRole })
                    );
                  }
                  if (editingClassification !== u.accountClassification) {
                    tasks.push(
                      updateClassificationMutation.mutateAsync({
                        userId: u.id,
                        accountClassification: editingClassification,
                      })
                    );
                  }
                  if (tasks.length === 0) {
                    setEditingUserId(null);
                    return;
                  }
                  void Promise.all(tasks).then(() => setEditingUserId(null));
                }}
                disabled={updateRoleMutation.isPending || updateClassificationMutation.isPending}
                className={adminDash.opBtn}
              >
                {(updateRoleMutation.isPending || updateClassificationMutation.isPending) ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  t("admin.save") || "حفظ"
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingUserId(null)}
                className={adminDash.opBtn}
              >
                {t("admin.cancel") || "إلغاء"}
              </Button>
            </>
          }
        />
      );
    }

    return (
      <AdminActionGroup
        ariaLabel={t("admin.userActions")}
        primary={
          u.id !== user?.id && !isProtectedUserId(u.id) ? (
            <AdminIconButton
              label={language === "ar" ? "تعديل الدور" : "Edit role"}
              onClick={() => {
                setEditingUserId(u.id);
                setEditingRole(u.role);
                setEditingClassification(u.accountClassification ?? "COMMERCIAL");
              }}
            >
              <Edit className="h-3.5 w-3.5" />
            </AdminIconButton>
          ) : null
        }
        secondary={
          isOwnerEntitled(u.commercial) ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEditSubDialog(u)}
                className={cn(adminDash.opBtn, adminActionBtn.info)}
              >
                {t("admin.editSubscription")}
              </Button>
              <AdminIconButton
                label={t("admin.deleteSubscription")}
                onClick={() => setDeleteSubUserId(u.id)}
                className={adminActionBtn.danger}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </AdminIconButton>
              <AdminIconButton
                label={language === "ar" ? "إنشاء فاتورة PDF" : "Generate invoice PDF"}
                onClick={() =>
                  generateInvoiceMutation.mutate({
                    userId: u.id,
                    subscriptionId: u.commercial?.subscriptionId || 0,
                  })
                }
                disabled={generateInvoiceMutation.isPending}
                className={adminActionBtn.teal}
              >
                {generateInvoiceMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
              </AdminIconButton>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openCreateSubDialog(u)}
              className={cn(adminDash.opBtn, adminActionBtn.success)}
            >
              <Plus className="h-3 w-3 me-1" />
              {t("admin.createAccountSubscription")}
            </Button>
          )
        }
        neutral={
          <AdminIconButton
            label={language === "ar" ? "إرسال إشعار" : "Send notification"}
            onClick={() => openNotifyDialog(u.id, u.name || u.email || "المستخدم")}
            className={adminActionBtn.warning}
          >
            <Bell className="h-3.5 w-3.5" />
          </AdminIconButton>
        }
        danger={
          u.id !== user?.id && !isProtectedUserId(u.id) ? (
            <AdminIconButton
              label={language === "ar" ? "حذف المستخدم" : "Delete user"}
              onClick={() => setDeleteUserId(u.id)}
              variant="destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </AdminIconButton>
          ) : null
        }
      />
    );
  };

  const hasUsers = (allUsers?.length ?? 0) > 0;
  const hasFilteredUsers = filteredUsers.length > 0;

  if (usersLoading) {
    return <AdminLoadingState variant="cardList" rows={3} label={t("common.loading") || "Loading..."} />;
  }

  return (
    <TooltipProvider>
      <Card className={adminDash.operationsCard}>
        <CardContent className="p-3 sm:p-4">
          <ResponsiveOperationsBar ariaLabel={t("users.searchPlaceholder")}>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                placeholder={t("users.searchPlaceholder") || "بحث بالاسم أو البريد..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-border bg-background pe-10 text-foreground"
                aria-label={t("users.searchPlaceholder")}
              />
            </div>
            <Select
              value={classificationFilter}
              onValueChange={(val) => setClassificationFilter(val as AccountClassification | "all")}
            >
              <SelectTrigger className="h-9 w-[160px] border-border bg-background">
                <SelectValue placeholder={language === "ar" ? "التصنيف" : "Classification"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "ar" ? "كل التصنيفات" : "All classifications"}</SelectItem>
                {ACCOUNT_CLASSIFICATIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {accountClassificationLabel(c, language === "ar" ? "ar" : "en")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInternalUserDialogOpen(true)}
              className={cn(adminDash.opBtn, adminActionBtn.success, "whitespace-nowrap")}
            >
              <UserPlus className="h-4 w-4 me-1" aria-hidden />
              {language === "ar" ? "حساب داخلي" : "Internal user"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkNotifyDialogOpen(true)}
              className={cn(adminDash.opBtn, adminActionBtn.warning, "whitespace-nowrap")}
            >
              <Bell className="h-4 w-4 me-1" aria-hidden />
              {language === "ar" ? "إشعار للجميع" : "Notify all"}
            </Button>
          </ResponsiveOperationsBar>
        </CardContent>
      </Card>

      <Card className={adminDash.operationsCard}>
        <CardHeader className="border-b border-border bg-background/50 py-3">
          <CardTitle className="text-base text-foreground sm:text-lg">
            {t("users.list") || "قائمة المستخدمين"} ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!hasUsers ? (
            <AdminEmptyState
              icon={Users}
              title={t("users.noUsers") || "لا يوجد مستخدمين"}
              description={t("users.description") || undefined}
            />
          ) : !hasFilteredUsers ? (
            <AdminEmptyState
              icon={Search}
              title={t("users.noUsersFiltered")}
              description={t("users.noUsersFilteredDesc")}
            />
          ) : (
            <>
              {/* Mobile / tablet card layout */}
              <div className="divide-y divide-border/50 lg:hidden" role="list">
                {filteredUsers.map((u: any) => (
                  <article key={u.id} className="space-y-3 p-4" role="listitem">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                        {u.role === "admin" ? "Admin" : "User"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {accountClassificationLabel(
                          u.accountClassification ?? "COMMERCIAL",
                          language === "ar" ? "ar" : "en"
                        )}
                      </Badge>
                      <span className="font-medium text-foreground">{u.name || (language === "ar" ? "بدون اسم" : "No name")}</span>
                      {isOwnerEntitled(u.commercial) ? getStatusBadge(ownerSubscriptionStatus(u.commercial)) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {t("admin.noAccountSubscription")}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs tabular-nums" dir="ltr">
                        {u.restaurants?.length ?? 0} {t("admin.restaurantCount")}
                      </Badge>
                    </div>
                    <dl className="grid gap-2 text-sm">
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-muted-foreground">{t("users.email")}:</dt>
                        <dd dir="ltr" className="text-foreground">{u.email || "-"}</dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-muted-foreground">{language === "ar" ? "الباقة" : "Plan"}:</dt>
                        <dd className="text-muted-foreground">
                          {ownerPlanLabel(u.commercial)}
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-muted-foreground">{language === "ar" ? "تاريخ الانتهاء" : "End date"}:</dt>
                        <dd dir="ltr" className="tabular-nums text-muted-foreground">
                          {u.commercial?.currentPeriodEnd
                            ? formatSubscriptionEndDate(u.commercial.currentPeriodEnd, language === "ar" ? "ar" : "en")
                            : "-"}
                        </dd>
                      </div>
                    </dl>
                    {renderUserActions(u)}
                  </article>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[720px]">
                  <thead className="border-b border-border bg-background/50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-start text-sm font-semibold text-foreground">
                        {t("users.name") || "الاسم"}
                      </th>
                      <th scope="col" className="px-4 py-3 text-start text-sm font-semibold text-foreground">
                        {t("users.email") || "البريد"}
                      </th>
                      <th scope="col" className="px-4 py-3 text-start text-sm font-semibold text-foreground">
                        {t("users.role") || "الدور"}
                      </th>
                      <th scope="col" className="px-4 py-3 text-start text-sm font-semibold text-foreground">
                        {language === "ar" ? "التصنيف" : "Classification"}
                      </th>
                      <th scope="col" className="px-4 py-3 text-start text-sm font-semibold text-foreground">
                        {t("admin.ownerAccountSubscription")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-start text-sm font-semibold text-foreground">
                        {t("admin.restaurantCount")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-start text-sm font-semibold text-foreground">
                        {language === "ar" ? "الباقة" : "Plan"}
                      </th>
                      <th scope="col" className="px-4 py-3 text-start text-sm font-semibold text-foreground">
                        {language === "ar" ? "تاريخ الانتهاء" : "End date"}
                      </th>
                      <th scope="col" className="px-4 py-3 text-start text-sm font-semibold text-foreground">
                        {t("users.actions") || "الإجراءات"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u: any, idx: number) => (
                      <tr key={u.id} className={idx % 2 === 0 ? "bg-background/30" : "bg-card/30"}>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div className="flex items-center gap-2">
                            <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                              {u.role === "admin" ? "Admin" : "User"}
                            </Badge>
                            {u.name || (language === "ar" ? "بدون اسم" : "No name")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr">
                          {u.email || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingUserId === u.id ? (
                            <Select value={editingRole} onValueChange={(val: "admin" | "user") => setEditingRole(val)}>
                              <SelectTrigger className="h-8 w-28 border-border bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">{language === "ar" ? "مستخدم" : "User"}</SelectItem>
                                <SelectItem value="admin">{language === "ar" ? "مسؤول" : "Admin"}</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                              {u.role === "admin" ? (language === "ar" ? "مسؤول" : "Admin") : (language === "ar" ? "مستخدم" : "User")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingUserId === u.id ? (
                            <Select
                              value={editingClassification}
                              onValueChange={(val: AccountClassification) => setEditingClassification(val)}
                            >
                              <SelectTrigger className="h-8 w-32 border-border bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACCOUNT_CLASSIFICATIONS.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {accountClassificationLabel(c, language === "ar" ? "ar" : "en")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">
                              {accountClassificationLabel(
                                u.accountClassification ?? "COMMERCIAL",
                                language === "ar" ? "ar" : "en"
                              )}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isOwnerEntitled(u.commercial) ? getStatusBadge(ownerSubscriptionStatus(u.commercial)) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {t("admin.noAccountSubscription")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums" dir="ltr">
                          {u.restaurants?.length ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {ownerPlanLabel(u.commercial)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr">
                          {u.commercial?.currentPeriodEnd
                            ? formatSubscriptionEndDate(u.commercial.currentPeriodEnd, language === "ar" ? "ar" : "en")
                            : "-"}
                        </td>
                        <td className="min-w-[220px] px-4 py-3 text-sm">{renderUserActions(u)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Internal user creation (ADMIN-AUTH-1B) */}
      <Dialog open={internalUserDialogOpen} onOpenChange={setInternalUserDialogOpen}>
        <DialogContent className={adminDash.dialogContent}>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {language === "ar" ? "إنشاء حساب داخلي" : "Create internal user"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {language === "ar"
                ? "حسابات الموظفين الداخليين — التصنيف INTERNAL ثابت"
                : "Internal staff accounts — classification is always INTERNAL"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("users.name") || "Name"}</Label>
              <Input value={internalName} onChange={(e) => setInternalName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("users.email") || "Email"}</Label>
              <Input type="email" value={internalEmail} onChange={(e) => setInternalEmail(e.target.value)} dir="ltr" />
            </div>
            <div className="grid gap-2">
              <Label>{language === "ar" ? "كلمة المرور" : "Password"}</Label>
              <Input
                type="password"
                value={internalPassword}
                onChange={(e) => setInternalPassword(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="grid gap-2">
              <Label>{language === "ar" ? "فئة الموظف" : "Staff category"}</Label>
              <Select
                value={internalStaffCategory}
                onValueChange={(val: InternalStaffCategory) => setInternalStaffCategory(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERNAL_STAFF_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("users.role") || "Role"}</Label>
              <Select value={internalRole} onValueChange={(val: "admin" | "user") => setInternalRole(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{language === "ar" ? "مستخدم" : "User"}</SelectItem>
                  <SelectItem value="admin">{language === "ar" ? "مسؤول" : "Admin"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInternalUserDialogOpen(false)}>
              {t("admin.cancel") || "Cancel"}
            </Button>
            <Button
              onClick={() =>
                createInternalUserMutation.mutate({
                  name: internalName,
                  email: internalEmail,
                  password: internalPassword,
                  role: internalRole,
                  staffCategory: internalStaffCategory,
                })
              }
              disabled={createInternalUserMutation.isPending}
            >
              {createInternalUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                language === "ar" ? "إنشاء" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Create/Edit Dialog */}
      <Dialog open={subDialogUser !== null} onOpenChange={(open) => !open && setSubDialogUser(null)}>
        <DialogContent className={adminDash.dialogContent}>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {subDialogMode === "create"
                ? t("admin.createAccountSubscriptionTitle")
                : t("admin.editAccountSubscriptionTitle")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {subDialogUser?.name || subDialogUser?.email || 'المستخدم'}
              {(subDialogUser?.restaurants?.length ?? 0) > 0 ? (
                <span className="mt-1 block text-xs">
                  {t("admin.restaurantCount")}: {subDialogUser.restaurants.length}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <SubscriptionAdminFormFields
            plans={plans}
            planId={subPlanId}
            onPlanIdChange={setSubPlanId}
            billingCycle={subBillingCycle}
            onBillingCycleChange={setSubBillingCycle}
            endDate={subEndDate}
            onEndDateChange={setSubEndDate}
            locale={language === "ar" ? "ar" : "en"}
            planLabel={language === "ar" ? "الباقة" : "Plan"}
            billingCycleLabel={language === "ar" ? "دورة الفوترة" : "Billing cycle"}
            endDateLabel={language === "ar" ? "تاريخ انتهاء الاشتراك (اختياري)" : "Subscription end (optional)"}
            status={subStatus}
            onStatusChange={setSubStatus}
            showStatus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialogUser(null)}>إلغاء</Button>
            <Button
              onClick={handleSubSubmit}
              disabled={createSubMutation.isPending || updateSubMutation.isPending}
            >
              {(createSubMutation.isPending || updateSubMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                subDialogMode === 'create' ? 'إنشاء' : 'تحديث'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteUserId !== null} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">تأكيد حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background border-border text-foreground">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUserMutation.mutate({ userId: deleteUserId })}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Custom Notification Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={(open) => !open && setNotifyDialogOpen(false)}>
        <DialogContent className={adminDash.dialogContent}>
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              إرسال إشعار
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              إرسال إشعار مخصص إلى: {notifyUserName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-foreground">نص الإشعار</Label>
              <Textarea
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                placeholder="اكتب نص الإشعار هنا..."
                className="bg-background border-border mt-1 min-h-[100px] text-foreground"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-end">{notifyMessage.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => notifyUserId && notifyMessage.trim() && sendNotifyMutation.mutate({ userId: notifyUserId, message: notifyMessage.trim() })}
              disabled={sendNotifyMutation.isPending || !notifyMessage.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {sendNotifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Send className="w-4 h-4 ms-1" /> إرسال</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Notification Dialog */}
      <Dialog open={bulkNotifyDialogOpen} onOpenChange={(open) => !open && setBulkNotifyDialogOpen(false)}>
        <DialogContent className={adminDash.dialogContent}>
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              إشعار لجميع المستخدمين
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              سيتم إرسال هذا الإشعار إلى جميع المستخدمين المسجلين ({allUsers?.length || 0} مستخدم)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-foreground">نص الإشعار</Label>
              <Textarea
                value={bulkNotifyMessage}
                onChange={(e) => setBulkNotifyMessage(e.target.value)}
                placeholder="اكتب نص الإشعار الذي سيُرسل لجميع المستخدمين..."
                className="bg-background border-border mt-1 min-h-[100px] text-foreground"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-end">{bulkNotifyMessage.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkNotifyDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => bulkNotifyMessage.trim() && sendBulkNotifyMutation.mutate({ message: bulkNotifyMessage.trim() })}
              disabled={sendBulkNotifyMutation.isPending || !bulkNotifyMessage.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {sendBulkNotifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Send className="w-4 h-4 ms-1" /> إرسال للجميع</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Subscription Confirmation Dialog */}
      <AlertDialog open={deleteSubUserId !== null} onOpenChange={(open) => !open && setDeleteSubUserId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">تأكيد حذف الاشتراك</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("admin.deleteAccountSubscriptionConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background border-border text-foreground">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSubUserId && deleteSubMutation.mutate({ userId: deleteSubUserId })}
              disabled={deleteSubMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteSubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حذف الاشتراك'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

export default function AdminManagement() {
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
  const { data: dashboardSummary, isLoading: summaryLoading, refetch: refetchSummary } =
    trpc.admin.getDashboardSummary.useQuery(undefined, { enabled: adminEnabled });
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

  const refetchCanonicalReads = () => {
    void refetchRestaurants();
    void refetchSummary();
  };

  const kpiLoading = summaryLoading;
  const kpis = useMemo(
    () => mapDashboardSummaryToKPIs(dashboardSummary),
    [dashboardSummary]
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
      refetchCanonicalReads();
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
      refetchCanonicalReads();
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

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  return (
    <TooltipProvider>
    <AdminOperationsShell
      title={t("admin.title")}
      subtitle={t("admin.subtitle")}
      breadcrumbs={[
        { label: t("admin.nav.overview"), href: "/admin" },
        { label: t("admin.nav.operations") },
      ]}
      headerActions={
        <Button
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 me-2" />
          {t("admin.addRestaurant")}
        </Button>
      }
    >
      <AdminKPISection
        kpis={kpis}
        loading={kpiLoading}
        locale={language === "ar" ? "ar" : "en"}
        title={t("admin.kpiOverview")}
        description={t("admin.kpiOverviewDesc")}
        labels={{
          activeRestaurants: t("admin.activeRestaurants"),
          activeSubscriptions: t("admin.activeSubscriptions"),
          expiringSoon: t("admin.expiringSoon"),
          estimatedMrr: t("admin.estimatedMrr"),
          totalUsers: t("admin.totalUsers"),
          activeRestaurantsHint:
            language === "ar" ? "مطاعم نشطة (تشغيلي)" : "Active venues (operational)",
          activeSubscriptionsHint:
            language === "ar" ? "مالكون — مصدر موحّد" : "Owner count — canonical",
          expiringSoonHint: t("admin.expiringSoonHint"),
          estimatedMrrHint: t("admin.estimatedMrrHint"),
        }}
        loadingLabel={t("common.loading")}
      />

      <AdminSection
        title={t("admin.restaurantsSection")}
        description={t("admin.restaurantsSectionDesc")}
        icon={Store}
      >
        <AdminOperationsSection
          toolbar={
            <ResponsiveOperationsBar ariaLabel={t("admin.searchPlaceholder")}>
              <div className="relative min-w-0 flex-1">
                <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  placeholder={t("admin.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-border bg-card pe-10 text-foreground"
                  aria-label={t("admin.searchPlaceholder")}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute start-3 top-1/2 -translate-y-1/2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={language === "ar" ? "مسح البحث" : "Clear search"}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                ) : null}
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full border-border bg-card sm:w-[200px]" aria-label={t("admin.filterByStatus")}>
                  <Filter className="me-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
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
          <div className="grid gap-4">
            {filteredRestaurants.map((restaurant: any) => {
              const commercial = restaurant.ownerCommercial;
              const entitled = isOwnerEntitled(commercial);
              const status = entitled ? ownerSubscriptionStatus(commercial) : "inactive";

              return (
                <Card
                  key={restaurant.id}
                  className={cn(adminDash.operationsCard, "transition hover:border-primary/40")}
                >
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{restaurant.nameAr}</h3>
                      {restaurant.nameEn ? (
                        <span className="text-sm text-muted-foreground" dir="ltr">
                          ({restaurant.nameEn})
                        </span>
                      ) : null}
                      <Badge variant={status === "active" ? "default" : "secondary"}>
                        {t(`subscription.status.${status}`)}
                      </Badge>
                    </div>
                    {restaurant.descriptionAr ? (
                      <p className="text-sm text-muted-foreground">{restaurant.descriptionAr}</p>
                    ) : null}
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      {restaurant.ownerName ? (
                        <div>
                          <dt className="text-muted-foreground">{t("admin.ownerName")}</dt>
                          <dd className="ms-0 mt-0.5 text-foreground">{restaurant.ownerName}</dd>
                        </div>
                      ) : null}
                      {restaurant.ownerEmail ? (
                        <div>
                          <dt className="text-muted-foreground">{t("admin.ownerEmail")}</dt>
                          <dd className="ms-0 mt-0.5 text-foreground" dir="ltr">
                            {restaurant.ownerEmail}
                          </dd>
                        </div>
                      ) : null}
                      {restaurant.phone ? (
                        <div>
                          <dt className="text-muted-foreground">{t("admin.phone")}</dt>
                          <dd className="ms-0 mt-0.5 text-foreground" dir="ltr">
                            {restaurant.phone}
                          </dd>
                        </div>
                      ) : null}
                      {restaurant.address ? (
                        <div>
                          <dt className="text-muted-foreground">{t("admin.address")}</dt>
                          <dd className="ms-0 mt-0.5 text-foreground">{restaurant.address}</dd>
                        </div>
                      ) : null}
                      {restaurant.countryCode ? (
                        <div>
                          <dt className="text-muted-foreground">{t("admin.country")}</dt>
                          <dd className="ms-0 mt-0.5 text-foreground">{restaurant.countryCode}</dd>
                        </div>
                      ) : null}
                      {restaurant.currencyCode ? (
                        <div>
                          <dt className="text-muted-foreground">{t("admin.menuCurrency")}</dt>
                          <dd className="ms-0 mt-0.5 text-foreground" dir="ltr">
                            {restaurant.currencyCode}
                            <span className="ms-1 text-xs text-muted-foreground">
                              ({language === "ar" ? "عرض المنيو" : "menu display"})
                            </span>
                          </dd>
                        </div>
                      ) : null}
                      <div className="sm:col-span-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                        <dt className="text-xs font-medium text-muted-foreground">
                          {t("admin.inheritedEntitlements")}
                        </dt>
                        <dd className="mt-2 flex flex-wrap items-center gap-2">
                          {entitled ? (
                            <>
                              <Badge variant={status === "active" ? "default" : "secondary"}>
                                {t(`subscription.status.${status}`)}
                              </Badge>
                              <span className="text-sm text-foreground">{ownerPlanLabel(commercial)}</span>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {t("admin.noAccountSubscription")}
                            </Badge>
                          )}
                        </dd>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t("admin.inheritedEntitlementsHint")}
                        </p>
                      </div>
                    </dl>

                    <AdminActionGroup
                      ariaLabel={t("admin.restaurantActions")}
                      primary={
                        <AdminIconButton
                          label={t("admin.editRestaurant")}
                          onClick={() => setLocation(`/dashboard?restaurant=${restaurant.id}`)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </AdminIconButton>
                      }
                      danger={
                        <AdminIconButton
                          label={t("admin.deleteRestaurantAction")}
                          variant="destructive"
                          onClick={() => setDeleteRestaurantId(restaurant.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </AdminIconButton>
                      }
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </AdminOperationsSection>
      </AdminSection>

      <AdminSection
        title={t("users.title") || "Users Management"}
        description={t("admin.usersSectionDesc")}
        icon={Users}
      >
        <UsersSection />
      </AdminSection>

      {/* Create Restaurant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetForm(); } }}>
        <DialogContent className={adminDash.dialogContent}>
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
        <AlertDialogContent className="bg-card border-border">
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

    </AdminOperationsShell>
    </TooltipProvider>
  );
}
