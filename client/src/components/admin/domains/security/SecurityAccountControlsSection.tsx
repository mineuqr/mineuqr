import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { SemanticConfirmDialog } from "@/design-system/semantic-confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { ADMIN_WORKSPACE_DIR, adminDash, adminActionBtn } from "@/components/admin/layout";
import { cn } from "@/lib/utils";
import type { InternalStaffCategory } from "@shared/accountClassification";
import type { SecurityAccountGovernance } from "./useSecurityAccountGovernance";

type SecurityInternalUserToolbarButtonProps = {
  governance: SecurityAccountGovernance;
};

export function SecurityInternalUserToolbarButton({ governance }: SecurityInternalUserToolbarButtonProps) {
  const { language, setInternalUserDialogOpen } = governance;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setInternalUserDialogOpen(true)}
      className={cn(adminDash.opBtn, adminActionBtn.success, "whitespace-nowrap")}
    >
      <UserPlus className="h-3.5 w-3.5 me-1" aria-hidden />
      {language === "ar" ? "حساب داخلي" : "Internal user"}
    </Button>
  );
}

type SecurityAccountControlsSectionProps = {
  governance: SecurityAccountGovernance;
};

export function SecurityAccountControlsSection({ governance }: SecurityAccountControlsSectionProps) {
  const {
    t,
    language,
    internalUserDialogOpen,
    setInternalUserDialogOpen,
    internalName,
    setInternalName,
    internalEmail,
    setInternalEmail,
    internalPassword,
    setInternalPassword,
    internalRole,
    setInternalRole,
    internalStaffCategory,
    setInternalStaffCategory,
    internalStaffCategories,
    createInternalUserMutation,
    createInternalUser,
    deleteUserId,
    setDeleteUserId,
    deleteUserMutation,
    confirmDeleteUser,
  } = governance;

  return (
    <>
      <Dialog open={internalUserDialogOpen} onOpenChange={setInternalUserDialogOpen}>
        <DialogContent dir={ADMIN_WORKSPACE_DIR} className={adminDash.dialogContent}>
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
              <Input
                type="email"
                value={internalEmail}
                onChange={(e) => setInternalEmail(e.target.value)}
                dir="ltr"
              />
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
                  {internalStaffCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("users.role") || "Role"}</Label>
              <Select
                value={internalRole}
                onValueChange={(val: "admin" | "user") => setInternalRole(val)}
              >
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
            <Button onClick={createInternalUser} disabled={createInternalUserMutation.isPending}>
              {createInternalUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : language === "ar" ? (
                "إنشاء"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SemanticConfirmDialog
        open={deleteUserId !== null}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
        kind="destructive"
        icon="delete"
        dir={ADMIN_WORKSPACE_DIR}
        title="تأكيد حذف المستخدم"
        description="هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء."
        cancelLabel="إلغاء"
        confirmLabel="حذف"
        onConfirm={confirmDeleteUser}
        loading={deleteUserMutation.isPending}
      />
    </>
  );
}
