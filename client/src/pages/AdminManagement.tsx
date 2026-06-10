import { useState, useMemo, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
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
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Loader2, Store, UserPlus, Search, Filter, X, Users, FileText, CreditCard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/_core/hooks/useAuth";
import { SubscriptionAdminFormFields } from "@/components/admin/subscription/SubscriptionAdminFormFields";
import {
  AdminOperationsShell,
  adminActionBtn,
  adminDash,
} from "@/components/admin/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunicationsTab } from "@/pages/admin/operations/CommunicationsTab";
import {
  DEFAULT_OPERATIONS_TAB,
  type OperationsTab,
  parseOperationsTab,
} from "@/pages/admin/operations/operationsTab";
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

// ─── Accounts Tab (REBUILD-3A) ───────────────────────────────────────
export function AccountsTab() {
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

// ─── Tenants Tab (REBUILD-3A) ────────────────────────────────────────
export function TenantsTab() {
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
            <div className={adminDash.opsTableWrap}>
              <table className={adminDash.opsTable}>
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[28%]" />
                  <col className="w-[24%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="border-b border-border/60 bg-muted/15">
                  <tr>
                    <th scope="col" className={adminDash.opsTableHead}>
                      {language === "ar" ? "المستأجر" : "Tenant"}
                    </th>
                    <th scope="col" className={adminDash.opsTableHead}>
                      {language === "ar" ? "حساب المالك" : "Owner account"}
                    </th>
                    <th scope="col" className={adminDash.opsTableHead}>
                      {language === "ar" ? "الاشتراك" : "Subscription"}
                    </th>
                    <th scope="col" className={cn(adminDash.opsTableHead, "text-end")}>
                      {t("users.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map((restaurant: any, idx: number) => {
                    const commercial = restaurant.ownerCommercial;
                    const entitled = isOwnerEntitled(commercial);
                    const status = entitled ? ownerSubscriptionStatus(commercial) : "inactive";

                    return (
                      <tr
                        key={restaurant.id}
                        className={cn(
                          "border-b border-border/30 last:border-b-0",
                          idx % 2 === 0 ? "bg-background/20" : "bg-transparent"
                        )}
                      >
                        <td className={cn(adminDash.opsTableCell, adminDash.opsTableTruncate, "text-foreground")}>
                          <div className="truncate font-medium">{restaurant.nameAr}</div>
                          {restaurant.nameEn ? (
                            <div className="truncate text-[11px] text-muted-foreground" dir="ltr">
                              {restaurant.nameEn}
                            </div>
                          ) : null}
                        </td>
                        <td className={cn(adminDash.opsTableCell, adminDash.opsTableTruncate, "text-muted-foreground")}>
                          <div className="truncate">{restaurant.ownerName || "—"}</div>
                          {restaurant.ownerEmail ? (
                            <div className="truncate text-[11px]" dir="ltr" title={restaurant.ownerEmail}>
                              {restaurant.ownerEmail}
                            </div>
                          ) : null}
                        </td>
                        <td className={cn(adminDash.opsTableCell, adminDash.opsTableTruncate)}>
                          {entitled ? (
                            <Badge
                              variant={status === "active" ? "default" : "secondary"}
                              className={adminDash.opsBadge}
                            >
                              {t(`subscription.status.${status}`)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={cn(adminDash.opsBadge, "text-muted-foreground")}>
                              {t("admin.noAccountSubscription")}
                            </Badge>
                          )}
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {entitled ? ownerPlanLabel(commercial) : "—"}
                          </div>
                        </td>
                        <td className={cn(adminDash.opsTableActionsCell, "text-end")}>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border/50 lg:hidden" role="list">
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
                          <Badge
                            variant={status === "active" ? "default" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {t(`subscription.status.${status}`)}
                          </Badge>
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
          </>
        )}
      </OperationsTabFrame>

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
    </TooltipProvider>
  );
}

export default function AdminManagement() {
  const gate = useAuthGate();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const activeTab = parseOperationsTab(search);

  const setTab = useCallback(
    (tab: OperationsTab) => {
      const raw = search.startsWith("?") ? search.slice(1) : search;
      const params = new URLSearchParams(raw);
      if (tab === DEFAULT_OPERATIONS_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const q = params.toString();
      setLocation(q ? `/admin/operations?${q}` : "/admin/operations");
    },
    [search, setLocation]
  );

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setTab(v as OperationsTab)} className="contents">
      <AdminOperationsShell
        compact
        narrowContent
        title={t("admin.operations.workspaceTitle")}
        breadcrumbs={[
          { label: t("admin.nav.overview"), href: "/admin" },
          { label: t("admin.nav.operations") },
        ]}
        headerFooter={
          <TabsList className={adminDash.opsTabList}>
            <TabsTrigger value="accounts" className="text-xs">
              {t("admin.operations.tabAccounts")}
            </TabsTrigger>
            <TabsTrigger value="tenants" className="text-xs">
              {t("admin.operations.tabTenants")}
            </TabsTrigger>
            <TabsTrigger value="communications" className="text-xs">
              {t("admin.operations.tabCommunications")}
            </TabsTrigger>
          </TabsList>
        }
      >
        <TabsContent value="accounts" className="mt-0">
          <AccountsTab />
        </TabsContent>
        <TabsContent value="tenants" className="mt-0">
          <TenantsTab />
        </TabsContent>
        <TabsContent value="communications" className="mt-0">
          <CommunicationsTab />
        </TabsContent>
      </AdminOperationsShell>
    </Tabs>
  );
}
