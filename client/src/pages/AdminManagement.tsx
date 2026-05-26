import { useState, useMemo } from "react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending, PageDataLoading } from "@/components/AuthGate";
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
import { toast } from "sonner";
import { Plus, Trash2, Edit, Loader2, Store, UserPlus, Key, Search, Filter, X, Bell, Send, Users, FileText, Download } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { SubscriptionAdminFormFields } from "@/components/admin/subscription/SubscriptionAdminFormFields";
import { formatPlanPriceForCycle, formatSubscriptionEndDate } from "@/lib/subscription";
import type { BillingCycle } from "@/lib/subscription";

// ─── Users Section Component ───────────────────────────────────────
function UsersSection() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<"admin" | "user">("user");
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

  const { data: allUsers, isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.listAllUsersWithSubscriptions.useQuery();
  const { data: plans } = trpc.subscription.listPlans.useQuery();

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
    setSubPlanId(u.subscription?.planId?.toString() || "");
    setSubBillingCycle(u.subscription?.billingCycle || "monthly");
    setSubStatus(u.subscription?.status || "active");
    setSubEndDate(u.subscription?.currentPeriodEnd ? u.subscription.currentPeriodEnd.split('T')[0] : "");
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

  if (usersLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Search + Bulk Notify */}
      <Card className="mb-4 bg-card border-border">
        <CardContent className="p-4">
          <div className="flex gap-2 items-center">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('users.searchPlaceholder') || 'بحث بالاسم أو البريد...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background border-border text-foreground flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkNotifyDialogOpen(true)}
              className="text-xs border-amber-500 text-amber-600 hover:bg-amber-50 whitespace-nowrap"
            >
              <Bell className="w-4 h-4 ms-1" />
              إشعار للجميع
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="bg-background border-b border-border py-3">
          <CardTitle className="text-foreground text-lg">
            {t('users.list') || 'قائمة المستخدمين'} ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('users.noUsers') || 'لا يوجد مستخدمين'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {t('users.name') || 'الاسم'}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {t('users.email') || 'البريد'}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {t('users.role') || 'الدور'}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      الاشتراك
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      الباقة
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      تاريخ الانتهاء
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {t('users.actions') || 'الإجراءات'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u: any, idx: number) => (
                    <tr key={u.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-card'}>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          {u.role === 'admin' ? (
                            <Badge variant="default" className="text-xs">Admin</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">User</Badge>
                          )}
                          {u.name || ('بدون اسم')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {u.email || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingUserId === u.id ? (
                          <Select value={editingRole} onValueChange={(val: any) => setEditingRole(val)}>
                            <SelectTrigger className="w-24 bg-background border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">مستخدم</SelectItem>
                              <SelectItem value="admin">مسؤول</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role === 'admin' ? 'مسؤول' : 'مستخدم'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {u.subscription ? getStatusBadge(u.subscription.status) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">بدون اشتراك</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {u.plan ? (language === 'ar' ? u.plan.nameAr : u.plan.nameEn) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {u.subscription?.currentPeriodEnd ? new Date(u.subscription.currentPeriodEnd).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1 flex-wrap">
                          {editingUserId === u.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateRoleMutation.mutate({ userId: u.id, role: editingRole })}
                                disabled={updateRoleMutation.isPending}
                                className="text-xs"
                              >
                                {updateRoleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'حفظ'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingUserId(null)} className="text-xs">
                                إلغاء
                              </Button>
                            </>
                          ) : (
                            <>
                              {u.id !== user?.id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setEditingUserId(u.id); setEditingRole(u.role); }}
                                  className="text-xs"
                                  title="تعديل الدور"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                              {/* Subscription actions */}
                              {u.subscription ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditSubDialog(u)}
                                    className="text-xs border-blue-500 text-blue-600 hover:bg-blue-50"
                                    title="تعديل الاشتراك"
                                  >
                                    تعديل الاشتراك
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDeleteSubUserId(u.id)}
                                    className="text-xs border-red-500 text-red-600 hover:bg-red-50"
                                    title="حذف الاشتراك"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => generateInvoiceMutation.mutate({ userId: u.id, subscriptionId: u.subscription?.id || 0 })}
                                    disabled={generateInvoiceMutation.isPending}
                                    className="text-xs border-teal-500 text-teal-600 hover:bg-teal-50"
                                    title="إنشاء فاتورة PDF"
                                  >
                                    {generateInvoiceMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openCreateSubDialog(u)}
                                  className="text-xs border-green-500 text-green-600 hover:bg-green-50"
                                  title="إنشاء اشتراك"
                                >
                                  <Plus className="w-3 h-3 ml-1" />
                                  اشتراك
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openNotifyDialog(u.id, u.name || u.email || 'المستخدم')}
                                className="text-xs border-amber-500 text-amber-600 hover:bg-amber-50"
                                title="إرسال إشعار"
                              >
                                <Bell className="w-3 h-3" />
                              </Button>
                              {u.id !== user?.id && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setDeleteUserId(u.id)}
                                  className="text-xs"
                                  title="حذف المستخدم"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Create/Edit Dialog */}
      <Dialog open={subDialogUser !== null} onOpenChange={(open) => !open && setSubDialogUser(null)}>
        <DialogContent className="bg-card border-border max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {subDialogMode === 'create' ? 'إنشاء اشتراك جديد' : 'تعديل الاشتراك'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {subDialogUser?.name || subDialogUser?.email || 'المستخدم'}
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
        <DialogContent className="bg-card border-border max-w-md w-[95vw]">
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
        <DialogContent className="bg-card border-border max-w-md w-[95vw]">
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
              هل أنت متأكد من حذف اشتراك هذا المستخدم؟ سيفقد الوصول إلى الميزات المدفوعة.
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
    </>
  );
}

export default function AdminManagement() {
  const gate = useAuthGate();
  const { user, isAuthenticated, authPending } = gate;
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<any>(null);
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
  const [planId, setPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [subscriptionEndDate, setSubscriptionEndDate] = useState("");
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

  // Edit subscription state
  const [editSubDialogOpen, setEditSubDialogOpen] = useState(false);
  const [editSubId, setEditSubId] = useState<number | null>(null);
  const [editSubPlanId, setEditSubPlanId] = useState<string>("");
  const [editSubBillingCycle, setEditSubBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [editSubEndDate, setEditSubEndDate] = useState("");
  const [editSubStatus, setEditSubStatus] = useState<string>("active");

  const adminEnabled = adminQueriesEnabled(
    authPending,
    isAuthenticated,
    user?.role === "admin"
  );

  // Queries
  const { data: plans } = trpc.subscription.listPlans.useQuery(undefined, {
    enabled: adminEnabled,
  });
  const { data: restaurantsWithSubs, isLoading: restaurantsLoading, refetch: refetchSubs } =
    trpc.admin.listAllRestaurantsWithSubscriptions.useQuery(undefined, { enabled: adminEnabled });
  // Use restaurantsWithSubs as the main restaurants list for admin
  const restaurants = restaurantsWithSubs;
  const refetchRestaurants = refetchSubs;
  const { data: countries } = trpc.countryCurrency.getAll.useQuery();

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
      refetchRestaurants();
      refetchSubs();
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
    setPlanId("");
    setBillingCycle("monthly");
    setSubscriptionEndDate("");
    setSelectedCountry("");
    setSelectedCurrency("");
    setCurrencySymbol("");
    setEditingRestaurant(null);
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRestaurant = async () => {
    if (!nameAr || !planId) {
      toast.error(t('admin.fillAllFields'));
      return;
    }

    setIsCreating(true);
    try {
      // Create subscriber account if requested
      if (createAccount && ownerEmail && subscriberPassword) {
        await createAccountMutation.mutateAsync({
          email: ownerEmail,
          password: subscriberPassword,
          name: subscriberName || nameAr,
        });
      }

      // Create restaurant
      const restaurantData = await createRestaurantMutation.mutateAsync({
        nameAr,
        nameEn: nameEn || undefined,
        descriptionAr: descriptionAr || undefined,
        ownerEmail: ownerEmail || undefined,
        phone: phone || undefined,
        address: address || undefined,
        countryCode: selectedCountry || undefined,
        currencyCode: selectedCurrency || undefined,
        currencySymbol: currencySymbol || undefined,
      });

      // Create subscription atomically after restaurant
      if (planId && restaurantData?.id) {
        await createSubscriptionMutation.mutateAsync({
          restaurantId: restaurantData.id,
          planId: parseInt(planId),
          billingCycle,
          subscriptionEndDate: subscriptionEndDate || undefined,
        });
      }

      toast.success(t('admin.restaurantCreated'));
      setShowCreateDialog(false);
      resetForm();
      refetchRestaurants();
      refetchSubs();
    } catch (err: any) {
      toast.error(err?.message || t('admin.createError'));
    } finally {
      setIsCreating(false);
    }
  };

  // Create subscription after restaurant is created
  const createSubscriptionMutation = trpc.admin.createRestaurantSubscription.useMutation();

  const updateSubscriptionMutation = trpc.admin.updateRestaurantSubscription.useMutation({
    onSuccess: () => {
      toast.success(t('admin.subscriptionUpdated'));
      refetchRestaurants();
      refetchSubs();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelSubscriptionMutation = trpc.admin.cancelRestaurantSubscription.useMutation({
    onSuccess: () => {
      toast.success(t('admin.subscriptionCanceled'));
      refetchRestaurants();
      refetchSubs();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSubscriptionMutation = trpc.admin.deleteRestaurantSubscription.useMutation({
    onSuccess: () => {
      toast.success(t('admin.subscriptionDeleted'));
      refetchRestaurants();
      refetchSubs();
    },
    onError: (err) => toast.error(err.message),
  });

    const getSubscriptionForRestaurant = (restaurantId: number) => {
    if (!restaurantsWithSubs) return null;
    const found = restaurantsWithSubs.find((r: any) => r.id === restaurantId);
    return found?.subscription || null;
  };
  const getSubscriptionStatus = (subscription: any): string => {
    if (!subscription) return "inactive";
    return subscription.status;
  };

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  return (
    <div className="min-h-screen cinematic-bg">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLocation("/")}
              className="brand-mark flex items-center gap-2 transition hover:opacity-80 select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
            >
              <Store className="w-6 h-6 text-primary" />
              <span className="font-bold text-foreground">{t('admin.title')}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setLocation("/statistics")}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {t('admin.statistics') || 'Statistics'}
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-heading text-3xl font-bold text-foreground">{t('admin.title')}</h1>
            <p className="ui-chrome text-muted-foreground mt-2">{t('admin.subtitle')}</p>
          </div>
          <Button
            onClick={() => { resetForm(); setShowCreateDialog(true); }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 ml-2" />
            {t('admin.addRestaurant')}
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-card border-border text-foreground"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-card border-border">
              <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
              <SelectValue placeholder={t('admin.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('subscription.status.active')}</SelectItem>
              <SelectItem value="trial">{t('subscription.status.trial')}</SelectItem>
              <SelectItem value="expired">{t('subscription.status.expired')}</SelectItem>
              <SelectItem value="canceled">{t('subscription.status.canceled')}</SelectItem>
              <SelectItem value="inactive">{t('subscription.status.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Restaurants List */}
        {restaurantsLoading ? (
          <PageDataLoading minHeight="min-h-[12rem]" />
        ) : !restaurants || restaurants.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">{t('admin.noRestaurants')}</h3>
              <p className="text-muted-foreground mb-6">{t('admin.startAdding')}</p>
              <Button
                onClick={() => { resetForm(); setShowCreateDialog(true); }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 ml-2" />
                {t('admin.addFirstRestaurant')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {restaurants.filter((restaurant: any) => {
              const subscription = getSubscriptionForRestaurant(restaurant.id);
              const status = getSubscriptionStatus(subscription);
              // Filter by search query
              const query = searchQuery.toLowerCase().trim();
              const matchesSearch = !query || 
                (restaurant.nameAr || '').toLowerCase().includes(query) ||
                (restaurant.nameEn || '').toLowerCase().includes(query) ||
                (restaurant.ownerName || '').toLowerCase().includes(query) ||
                (restaurant.ownerEmail || '').toLowerCase().includes(query) ||
                (restaurant.phone || '').includes(query);
              // Filter by status
              const matchesStatus = statusFilter === 'all' || status === statusFilter;
              return matchesSearch && matchesStatus;
            }).map((restaurant: any) => {
              const subscription = getSubscriptionForRestaurant(restaurant.id);
              const status = getSubscriptionStatus(subscription);
              
              return (
                <Card key={restaurant.id} className="bg-card border-border hover:border-primary/50 transition">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">{restaurant.nameAr}</h3>
                          {restaurant.nameEn && <span className="text-sm text-muted-foreground">({restaurant.nameEn})</span>}
                          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                            {t(`subscription.status.${status}`)}
                          </Badge>
                        </div>
                        {restaurant.descriptionAr && (
                          <p className="text-sm text-muted-foreground mb-3">{restaurant.descriptionAr}</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          {restaurant.ownerName && (
                            <div>
                              <span className="text-muted-foreground">{t('admin.ownerName')}:</span>
                              <span className="ml-2 text-foreground">{restaurant.ownerName}</span>
                            </div>
                          )}
                          {restaurant.ownerEmail && (
                            <div>
                              <span className="text-muted-foreground">{t('admin.ownerEmail')}:</span>
                              <span className="ml-2 text-foreground" dir="ltr">{restaurant.ownerEmail}</span>
                            </div>
                          )}
                          {restaurant.phone && (
                            <div>
                              <span className="text-muted-foreground">{t('admin.phone')}:</span>
                              <span className="ml-2 text-foreground">{restaurant.phone}</span>
                            </div>
                          )}
                          {restaurant.address && (
                            <div>
                              <span className="text-muted-foreground">{t('admin.address')}:</span>
                              <span className="ml-2 text-foreground">{restaurant.address}</span>
                            </div>
                          )}
                          {restaurant.countryCode && (
                            <div>
                              <span className="text-muted-foreground">{t('dashboard.country')}:</span>
                              <span className="ml-2 text-foreground">{restaurant.countryCode}</span>
                            </div>
                          )}
                          {restaurant.currencyCode && (
                            <div>
                              <span className="text-muted-foreground">{t('dashboard.currency')}:</span>
                              <span className="ml-2 text-foreground">{restaurant.currencySymbol} ({restaurant.currencyCode})</span>
                            </div>
                          )}
                          {subscription && (
                            <>
                              <div>
                                <span className="text-muted-foreground">{t('admin.plan')}:</span>
                                <span className="ms-2 text-foreground">{plans?.find((p: any) => p.id === subscription.planId)?.nameAr || subscription.planId}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('admin.billingCycle')}:</span>
                                <span className="ms-2 text-foreground">{t(`subscription.billingCycle.${subscription.billingCycle}`)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{language === "ar" ? "السعر" : "Price"}:</span>
                                <span className="ms-2" dir="ltr">
                                  {formatPlanPriceForCycle(
                                    plans?.find((p: any) => p.id === subscription.planId),
                                    subscription.billingCycle as BillingCycle,
                                    language === "ar" ? "ar" : "en"
                                  )}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('admin.periodEnd')}:</span>
                                <span className="ms-2 text-foreground" dir="ltr">
                                  {formatSubscriptionEndDate(subscription.currentPeriodEnd, language === "ar" ? "ar" : "en")}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        {/* Subscription Action Buttons */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {!subscription && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-primary/50 text-primary hover:bg-primary/10"
                              onClick={() => {
                                if (!plans || plans.length === 0) {
                                  toast.error(t('admin.noPlansAvailable'));
                                  return;
                                }
                                createSubscriptionMutation.mutate({
                                  restaurantId: restaurant.id,
                                  planId: plans[0].id,
                                  billingCycle: "monthly",
                                });
                              }}
                              disabled={createSubscriptionMutation.isPending}
                            >
                              {createSubscriptionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : null}
                              {t('admin.activateSubscription')}
                            </Button>
                          )}
                          {subscription && subscription.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                onClick={() => {
                                  setEditSubId(subscription.id);
                                  setEditSubPlanId(subscription.planId?.toString() || "");
                                  setEditSubBillingCycle(subscription.billingCycle || "monthly");
                                  setEditSubEndDate(subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString().split('T')[0] : "");
                                  setEditSubStatus(subscription.status);
                                  setEditSubDialogOpen(true);
                                }}
                              >
                                <Edit className="w-3 h-3 ml-1" />
                                {t('admin.editSubscription')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                                onClick={() => deleteSubscriptionMutation.mutate({ subscriptionId: subscription.id })}
                                disabled={deleteSubscriptionMutation.isPending}
                              >
                                {deleteSubscriptionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Trash2 className="w-3 h-3 ml-1" />}
                                {t('admin.deleteSubscription')}
                              </Button>
                            </>
                          )}
                          {subscription && subscription.status === 'canceled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                              onClick={() => updateSubscriptionMutation.mutate({
                                subscriptionId: subscription.id,
                                status: "active",
                              })}
                              disabled={updateSubscriptionMutation.isPending}
                            >
                              {updateSubscriptionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : null}
                              {t('admin.reactivateSubscription')}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/dashboard?restaurant=${restaurant.id}`)}
                          className="border-border/50 text-foreground"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteRestaurantId(restaurant.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
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
         {/* Users Section */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">{t('users.title') || 'إدارة المستخدمين'}</h2>
          </div>
          <UsersSection />
        </div>
      </main>
      {/* Create Restaurant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetForm(); } }}>
        <DialogContent className="bg-card border-border max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
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
            <SubscriptionAdminFormFields
              plans={plans}
              planId={planId}
              onPlanIdChange={setPlanId}
              billingCycle={billingCycle}
              onBillingCycleChange={(cycle: BillingCycle) => setBillingCycle(cycle)}
              endDate={subscriptionEndDate}
              onEndDateChange={setSubscriptionEndDate}
              locale={language === "ar" ? "ar" : "en"}
              planLabel={`${t("admin.plan")} *`}
              billingCycleLabel={t("admin.billingCycle")}
              endDateLabel={t("admin.subscriptionEndDate")}
              showStatus={false}
            />
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
              {isCreating && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
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

      {/* Edit Subscription Dialog */}
      <Dialog open={editSubDialogOpen} onOpenChange={(open) => { if (!open) setEditSubDialogOpen(false); }}>
        <DialogContent className="bg-card border-border max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('admin.editSubscription')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{t('admin.editSubscriptionDesc')}</DialogDescription>
          </DialogHeader>
          <SubscriptionAdminFormFields
            plans={plans}
            planId={editSubPlanId}
            onPlanIdChange={setEditSubPlanId}
            billingCycle={editSubBillingCycle}
            onBillingCycleChange={setEditSubBillingCycle}
            endDate={editSubEndDate}
            onEndDateChange={setEditSubEndDate}
            locale={language === "ar" ? "ar" : "en"}
            planLabel={t("admin.plan")}
            billingCycleLabel={t("admin.billingCycle")}
            endDateLabel={t("admin.periodEnd")}
            showStatus={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSubDialogOpen(false)} className="border-border/50 text-foreground">
              {t('admin.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (editSubId) {
                  updateSubscriptionMutation.mutate({
                    subscriptionId: editSubId,
                    planId: editSubPlanId ? parseInt(editSubPlanId) : undefined,
                    billingCycle: editSubBillingCycle,
                    subscriptionEndDate: editSubEndDate || undefined,
                  });
                  setEditSubDialogOpen(false);
                }
              }}
              disabled={updateSubscriptionMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {updateSubscriptionMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {t('admin.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
