import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Trash2, Loader2, Search, Users, FileText, CreditCard } from "lucide-react";
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
import { ACCOUNT_CLASSIFICATIONS, type AccountClassification } from "@shared/accountClassification";
import { accountClassificationLabel } from "@/lib/admin/accountClassificationDisplay";
import {
  canMutateAccountLifecycle,
  SecurityAccountControlsSection,
  SecurityClassificationCell,
  SecurityDeleteUserAction,
  SecurityInternalUserToolbarButton,
  SecurityPlatformAccountBadge,
  SecurityRoleBadge,
  SecurityRoleCell,
  SecurityRoleGovernanceActions,
  useSecurityAccountGovernance,
} from "@/components/admin/domains/security";

export function CustomerSuccessAccountsSection() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<AccountClassification | "all">("all");
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
  const governance = useSecurityAccountGovernance(refetchUsers);

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
    const isEditing = governance.editingUserId === u.id;

    return (
      <AdminActionGroup
        compact
        ariaLabel={t("admin.userActions")}
        primary={<SecurityRoleGovernanceActions user={u} governance={governance} />}
        secondary={
          !isEditing && canMutateAccountLifecycle(u) ? (
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
        danger={!isEditing ? <SecurityDeleteUserAction user={u} governance={governance} /> : null}
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
            <SecurityInternalUserToolbarButton governance={governance} />
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
                        <SecurityRoleBadge
                          role={u.role}
                          language={language === "ar" ? "ar" : "en"}
                        />
                        <Badge variant="outline" className={adminDash.opsBadge}>
                          {accountClassificationLabel(
                            u.accountClassification ?? "COMMERCIAL",
                            language === "ar" ? "ar" : "en"
                          )}
                        </Badge>
                        <SecurityPlatformAccountBadge
                          user={u}
                          label={t("admin.operations.platformBadge")}
                        />
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
                            <SecurityRoleCell user={u} governance={governance} />
                            <SecurityPlatformAccountBadge
                              user={u}
                              label={t("admin.operations.platformBadge")}
                            />
                          </div>
                        </td>
                        <td className={adminDash.opsTableCell}>
                          <SecurityClassificationCell user={u} governance={governance} />
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

      <SecurityAccountControlsSection governance={governance} />

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
