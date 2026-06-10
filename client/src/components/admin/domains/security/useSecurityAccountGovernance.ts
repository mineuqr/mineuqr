import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ACCOUNT_CLASSIFICATIONS,
  INTERNAL_STAFF_CATEGORIES,
  type AccountClassification,
  type InternalStaffCategory,
} from "@shared/accountClassification";

export function useSecurityAccountGovernance(refetchUsers: () => void) {
  const { user } = useAuth();
  const { t, language } = useLanguage();

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

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success(t("users.roleUpdated") || "تم تحديث الدور");
      setEditingUserId(null);
      refetchUsers();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || t("common.error"));
    },
  });

  const updateClassificationMutation = trpc.admin.updateAccountClassification.useMutation({
    onSuccess: () => {
      toast.success(language === "ar" ? "تم تحديث التصنيف" : "Classification updated");
      setEditingUserId(null);
      refetchUsers();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || t("common.error"));
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
    onError: (error: { message?: string }) => {
      toast.error(error.message || t("common.error"));
    },
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success(t("users.userDeleted") || "تم حذف المستخدم");
      setDeleteUserId(null);
      refetchUsers();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || t("common.error"));
    },
  });

  const startEditingUser = (u: {
    id: number;
    role: "admin" | "user";
    accountClassification?: AccountClassification;
  }) => {
    setEditingUserId(u.id);
    setEditingRole(u.role);
    setEditingClassification(u.accountClassification ?? "COMMERCIAL");
  };

  const cancelEditingUser = () => {
    setEditingUserId(null);
  };

  const saveUserEdits = (u: {
    id: number;
    role: "admin" | "user";
    accountClassification?: AccountClassification;
  }) => {
    const tasks: Promise<unknown>[] = [];
    if (editingRole !== u.role) {
      tasks.push(updateRoleMutation.mutateAsync({ userId: u.id, role: editingRole }));
    }
    if (editingClassification !== (u.accountClassification ?? "COMMERCIAL")) {
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
  };

  const createInternalUser = () => {
    createInternalUserMutation.mutate({
      name: internalName,
      email: internalEmail,
      password: internalPassword,
      role: internalRole,
      staffCategory: internalStaffCategory,
    });
  };

  const confirmDeleteUser = () => {
    if (deleteUserId) {
      deleteUserMutation.mutate({ userId: deleteUserId });
    }
  };

  return {
    currentUserId: user?.id,
    language,
    t,
    accountClassifications: ACCOUNT_CLASSIFICATIONS,
    internalStaffCategories: INTERNAL_STAFF_CATEGORIES,
    deleteUserId,
    setDeleteUserId,
    editingUserId,
    editingRole,
    setEditingRole,
    editingClassification,
    setEditingClassification,
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
    updateRoleMutation,
    updateClassificationMutation,
    createInternalUserMutation,
    deleteUserMutation,
    startEditingUser,
    cancelEditingUser,
    saveUserEdits,
    createInternalUser,
    confirmDeleteUser,
  };
}

export type SecurityAccountGovernance = ReturnType<typeof useSecurityAccountGovernance>;
