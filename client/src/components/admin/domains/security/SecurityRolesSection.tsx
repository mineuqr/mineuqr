import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { adminDash } from "@/components/admin/layout";
import { AdminIconButton } from "@/components/admin/operations";
import { cn } from "@/lib/utils";
import {
  canDeleteAccountUser,
  canEditAccountGovernance,
} from "./securityGovernance";
import type { AccountClassification } from "@shared/accountClassification";
import type { PlatformAccountProtectable } from "@shared/platformAccount";
import type { SecurityAccountGovernance } from "./useSecurityAccountGovernance";

type SecurityRoleSelectProps = {
  value: "admin" | "user";
  onChange: (value: "admin" | "user") => void;
  language: "ar" | "en";
};

export function SecurityRoleSelect({ value, onChange, language }: SecurityRoleSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(adminDash.opsSelect, "h-7 w-full max-w-[7rem] border-border bg-background")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">{language === "ar" ? "مستخدم" : "User"}</SelectItem>
        <SelectItem value="admin">{language === "ar" ? "مسؤول" : "Admin"}</SelectItem>
      </SelectContent>
    </Select>
  );
}

type SecurityRoleBadgeProps = {
  role: "admin" | "user";
  language: "ar" | "en";
};

export function SecurityRoleBadge({ role, language }: SecurityRoleBadgeProps) {
  return (
    <Badge variant={role === "admin" ? "default" : "secondary"} className={adminDash.opsBadge}>
      {role === "admin"
        ? language === "ar"
          ? "مسؤول"
          : "Admin"
        : language === "ar"
          ? "مستخدم"
          : "User"}
    </Badge>
  );
}

type SecurityRoleGovernanceActionsProps = {
  user: PlatformAccountProtectable & {
    id: number;
    role: "admin" | "user";
    accountClassification?: AccountClassification;
  };
  governance: SecurityAccountGovernance;
};

export function SecurityRoleGovernanceActions({ user, governance }: SecurityRoleGovernanceActionsProps) {
  const {
    currentUserId,
    language,
    t,
    editingUserId,
    editingRole,
    updateRoleMutation,
    updateClassificationMutation,
    startEditingUser,
    cancelEditingUser,
    saveUserEdits,
  } = governance;

  if (editingUserId === user.id) {
    return (
      <>
        <Button
          size="sm"
          variant="default"
          onClick={() => saveUserEdits(user)}
          disabled={updateRoleMutation.isPending || updateClassificationMutation.isPending}
          className={adminDash.opBtn}
        >
          {updateRoleMutation.isPending || updateClassificationMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            t("admin.save") || "حفظ"
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={cancelEditingUser}
          className={adminDash.opBtn}
        >
          {t("admin.cancel") || "إلغاء"}
        </Button>
      </>
    );
  }

  if (!canEditAccountGovernance(user, currentUserId)) {
    return null;
  }

  return (
    <AdminIconButton
      compact
      label={language === "ar" ? "تعديل الدور" : "Edit role"}
      onClick={() => startEditingUser(user)}
    >
      <Edit className="h-3.5 w-3.5" />
    </AdminIconButton>
  );
}

export function SecurityRoleCell({
  user,
  governance,
}: {
  user: PlatformAccountProtectable & {
    id: number;
    role: "admin" | "user";
    accountClassification?: AccountClassification;
  };
  governance: SecurityAccountGovernance;
}) {
  const { editingUserId, editingRole, setEditingRole, language } = governance;

  if (editingUserId === user.id) {
    return (
      <SecurityRoleSelect
        value={editingRole}
        onChange={setEditingRole}
        language={language === "ar" ? "ar" : "en"}
      />
    );
  }

  return (
    <SecurityRoleBadge role={user.role} language={language === "ar" ? "ar" : "en"} />
  );
}

export function SecurityDeleteUserAction({
  user,
  governance,
}: {
  user: PlatformAccountProtectable & { id: number };
  governance: SecurityAccountGovernance;
}) {
  const { currentUserId, language, setDeleteUserId } = governance;

  if (!canDeleteAccountUser(user, currentUserId)) {
    return null;
  }

  return (
    <AdminIconButton
      compact
      label={language === "ar" ? "حذف المستخدم" : "Delete user"}
      onClick={() => setDeleteUserId(user.id)}
      variant="destructive"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </AdminIconButton>
  );
}
