import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Loader2, UserPlus, Search, Users, FileText, CreditCard } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { SubscriptionAdminFormFields } from "@/components/admin/subscription/SubscriptionAdminFormFields";
import { adminActionBtn, adminDash } from "@/components/admin/layout";
import {
  AdminActionGroup,
  AdminEmptyState,
  AdminIconButton,
  AdminLoadingState,
  OperationsTabFrame,
  ResponsiveOperationsBar,
} from "@/components/admin/operations";
import {
  isOwnerEntitled,
  ownerPlanLabel,
  ownerSubscriptionStatus,
} from "@/lib/admin/ownerCommercialDisplay";
import { formatSubscriptionEndDate } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { isProtectedPlatformAccountUser } from "@shared/platformAccount";
import {
  ACCOUNT_CLASSIFICATIONS,
  INTERNAL_STAFF_CATEGORIES,
  type AccountClassification,
  type InternalStaffCategory,
} from "@shared/accountClassification";
import { accountClassificationLabel } from "@/lib/admin/accountClassificationDisplay";

export function CustomerSuccessAccountsSection() {
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
      case 'active': return <Badge className={cn(adminDash.opsBadge, "bg-green-600 text-white")}>فعال</Badge>;
      case 'trial': return <Badge className={cn(adminDash.opsBadge, "bg-blue-600 text-white")}>تجريبي</Badge>;
      case 'expired': return <Badge className={cn(adminDash.opsBadge, "bg-red-600 text-white")}>منتهي</Badge>;
      case 'canceled': return <Badge className={cn(adminDash.opsBadge, "bg-gray-600 text-white")}>ملغي</Badge>;
      default: return <Badge variant="secondary" className={adminDash.opsBadge}>بدون اشتراك</Badge>;
    }
  };

  const renderUserActions = (u: any) => {
    if (editingUserId === u.id) {
      return (
        <AdminActionGroup
          compact
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
        compact
        ariaLabel={t("admin.userActions")}
        primary={
          u.id !== user?.id && !isProtectedPlatformAccountUser(u) ? (
            <AdminIconButton
              compact
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
          !isProtectedPlatformAccountUser(u) ? (
            isOwnerEntitled(u.commercial) ? (
              <>
                <AdminIconButton
                  compact
                  label={t("admin.editSubscription")}
                  onClick={() => openEditSubDialog(u)}
                  className={adminActionBtn.info}
                >
                  <CreditCard className="h-3 w-3" />
                </AdminIconButton>
                <AdminIconButton
                  compact
                  label={t("admin.deleteSubscription")}
                  onClick={() => setDeleteSubUserId(u.id)}
                  className={adminActionBtn.danger}
                >
                  <Trash2 className="h-3 w-3" />
                </AdminIconButton>
                <AdminIconButton
                  compact
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
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <FileText className="h-3 w-3" />
                  )}
                </AdminIconButton>
              </>
            ) : (
              <AdminIconButton
                compact
                label={t("admin.createAccountSubscription")}
                onClick={() => openCreateSubDialog(u)}
                className={adminActionBtn.success}
              >
                <Plus className="h-3 w-3" />
              </AdminIconButton>
            )
          ) : null
        }
        danger={
          u.id !== user?.id && !isProtectedPlatformAccountUser(u) ? (
            <AdminIconButton
              compact
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
      <OperationsTabFrame
        listLabel={`${t("users.list") || "Users"} (${filteredUsers.length})`}
        toolbar={
          <ResponsiveOperationsBar ariaLabel={t("users.searchPlaceholder")}>
            <div className="relative min-w-0 flex-1">
              <Search
                className="absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder={t("users.searchPlaceholder") || "بحث بالاسم أو البريد..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  adminDash.opsInput,
                  "border-border bg-background pe-9 text-foreground"
                )}
                aria-label={t("users.searchPlaceholder")}
              />
            </div>
            <Select
              value={classificationFilter}
              onValueChange={(val) => setClassificationFilter(val as AccountClassification | "all")}
            >
              <SelectTrigger
                className={cn(adminDash.opsSelect, "w-full border-border bg-background sm:w-[148px]")}
              >
                <SelectValue placeholder={language === "ar" ? "التصنيف" : "Classification"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === "ar" ? "كل التصنيفات" : "All classifications"}
                </SelectItem>
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
              <UserPlus className="h-3.5 w-3.5 me-1" aria-hidden />
              {language === "ar" ? "حساب داخلي" : "Internal user"}
            </Button>
          </ResponsiveOperationsBar>
        }
      >
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
                  <article key={u.id} className={cn(adminDash.opsListRow, "flex-col items-stretch sm:flex-row sm:items-center")} role="listitem">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className={adminDash.opsIdentityName}>
                        {u.name || (language === "ar" ? "بدون اسم" : "No name")}
                      </div>
                      <div className={cn(adminDash.opsIdentityEmail, "border-t-0 pt-0")} dir="ltr">
                        {u.email || "—"}
                      </div>
                      <div className={cn(adminDash.opsIdentityRole, "border-t-0 pt-0")}>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className={adminDash.opsBadge}>
                          {u.role === "admin" ? "Admin" : "User"}
                        </Badge>
                        <Badge variant="outline" className={adminDash.opsBadge}>
                          {accountClassificationLabel(
                            u.accountClassification ?? "COMMERCIAL",
                            language === "ar" ? "ar" : "en"
                          )}
                        </Badge>
                        {isProtectedPlatformAccountUser(u) ? (
                          <Badge variant="secondary" className={adminDash.opsBadge}>
                            {t("admin.operations.platformBadge")}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <dl className="grid gap-2 text-sm">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isOwnerEntitled(u.commercial) ? getStatusBadge(ownerSubscriptionStatus(u.commercial)) : (
                          <Badge variant="outline" className={cn(adminDash.opsBadge, "text-muted-foreground")}>
                            {t("admin.noAccountSubscription")}
                          </Badge>
                        )}
                        <span className="text-xs tabular-nums text-muted-foreground" dir="ltr">
                          {u.restaurants?.length ?? 0} {t("admin.restaurantCount")}
                        </span>
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

              {/* Desktop table — UX-REFINE-1B: fixed layout, no horizontal scroll */}
              <div className={adminDash.opsTableWrap}>
                <table className={adminDash.opsTable}>
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[14%]" />
                    <col className="w-[22%]" />
                    <col className="w-[14%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead className="border-b border-border/60 bg-muted/15">
                    <tr>
                      <th scope="col" className={adminDash.opsTableHead}>
                        {language === "ar" ? "الحساب" : "Account"}
                      </th>
                      <th scope="col" className={adminDash.opsTableHead}>
                        {language === "ar" ? "التصنيف" : "Classification"}
                      </th>
                      <th scope="col" className={adminDash.opsTableHead}>
                        {language === "ar" ? "الاشتراك" : "Subscription"}
                      </th>
                      <th scope="col" className={adminDash.opsTableHead}>
                        {language === "ar" ? "التفاصيل" : "Details"}
                      </th>
                      <th scope="col" className={cn(adminDash.opsTableHead, "text-end")}>
                        {t("users.actions") || "الإجراءات"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u: any, idx: number) => (
                      <tr
                        key={u.id}
                        className={cn(
                          "border-b border-border/30 last:border-b-0",
                          idx % 2 === 0 ? "bg-background/20" : "bg-transparent"
                        )}
                      >
                        <td className={cn(adminDash.opsTableCell, adminDash.opsTableTruncate, "text-foreground")}>
                          <div className={adminDash.opsIdentityName}>
                            {u.name || (language === "ar" ? "بدون اسم" : "No name")}
                          </div>
                          <div
                            className={adminDash.opsIdentityEmail}
                            dir="ltr"
                            title={u.email || undefined}
                          >
                            {u.email || "—"}
                          </div>
                          <div className={adminDash.opsIdentityRole}>
                            {editingUserId === u.id ? (
                              <Select value={editingRole} onValueChange={(val: "admin" | "user") => setEditingRole(val)}>
                                <SelectTrigger className={cn(adminDash.opsSelect, "h-7 w-full max-w-[7rem] border-border bg-background")}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">{language === "ar" ? "مستخدم" : "User"}</SelectItem>
                                  <SelectItem value="admin">{language === "ar" ? "مسؤول" : "Admin"}</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={u.role === "admin" ? "default" : "secondary"} className={adminDash.opsBadge}>
                                {u.role === "admin" ? (language === "ar" ? "مسؤول" : "Admin") : (language === "ar" ? "مستخدم" : "User")}
                              </Badge>
                            )}
                            {isProtectedPlatformAccountUser(u) ? (
                              <Badge variant="secondary" className={adminDash.opsBadge}>
                                {t("admin.operations.platformBadge")}
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className={adminDash.opsTableCell}>
                          {editingUserId === u.id ? (
                            <Select
                              value={editingClassification}
                              onValueChange={(val: AccountClassification) => setEditingClassification(val)}
                            >
                              <SelectTrigger className={cn(adminDash.opsSelect, "h-7 w-full border-border bg-background")}>
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
                            <Badge variant="outline" className={adminDash.opsBadge}>
                              {accountClassificationLabel(
                                u.accountClassification ?? "COMMERCIAL",
                                language === "ar" ? "ar" : "en"
                              )}
                            </Badge>
                          )}
                        </td>
                        <td className={cn(adminDash.opsTableCell, adminDash.opsTableTruncate)}>
                          <div className="flex flex-wrap items-center gap-1">
                            {isOwnerEntitled(u.commercial) ? getStatusBadge(ownerSubscriptionStatus(u.commercial)) : (
                              <Badge variant="outline" className={cn(adminDash.opsBadge, "text-muted-foreground")}>
                                {t("admin.noAccountSubscription")}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {ownerPlanLabel(u.commercial)}
                          </div>
                        </td>
                        <td className={cn(adminDash.opsTableCell, "text-muted-foreground")}>
                          <div className="tabular-nums" dir="ltr">
                            {u.restaurants?.length ?? 0} {t("admin.restaurantCount")}
                          </div>
                          <div className="text-[11px] tabular-nums" dir="ltr">
                            {u.commercial?.currentPeriodEnd
                              ? formatSubscriptionEndDate(u.commercial.currentPeriodEnd, language === "ar" ? "ar" : "en")
                              : "—"}
                          </div>
                        </td>
                        <td className={cn(adminDash.opsTableActionsCell, "text-end")}>
                          {renderUserActions(u)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
      </OperationsTabFrame>

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
