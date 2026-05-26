import { useState } from "react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending, PageDataLoading } from "@/components/AuthGate";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Edit, Loader2, Search, Shield, User } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function Users() {
  const gate = useAuthGate();
  const { user, isAuthenticated, authPending } = gate;
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<"admin" | "user">("user");

  const adminEnabled = adminQueriesEnabled(
    authPending,
    isAuthenticated,
    user?.role === "admin"
  );

  const { data: users, isLoading: usersLoading, refetch: refetchUsers } =
    trpc.admin.listAllUsers.useQuery(undefined, { enabled: adminEnabled });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success(t("users.roleUpdated"));
      setEditingUserId(null);
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message || t("common.error"));
    },
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success(t("users.userDeleted"));
      setDeleteUserId(null);
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message || t("common.error"));
    },
  });

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  if (usersLoading) {
    return <PageDataLoading />;
  }

  const filteredUsers =
    users?.filter(
      (u: any) =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const handleUpdateRole = (userId: number, newRole: "admin" | "user") => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleDeleteUser = (userId: number) => {
    deleteUserMutation.mutate({ userId });
  };

  return (
    <div className="min-h-screen cinematic-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {t("users.title")}
          </h1>
          <p className="text-muted-foreground">{t("users.description")}</p>
        </div>

        {/* Search */}
        <Card className="mb-6 bg-card border-border">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Search className="w-5 h-5 text-muted-foreground mt-3" />
              <Input
                placeholder={t("users.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background border-border text-foreground"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="bg-background border-b border-border">
            <CardTitle className="text-foreground">
              {t("users.list")} ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{t("users.noUsers")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        {t("users.name")}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        {t("users.email")}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        {t("users.role")}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        {t("users.joinDate")}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        {t("users.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u: any, idx: number) => (
                      <tr key={u.id} className={idx % 2 === 0 ? "bg-background" : "bg-card"}>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div className="flex items-center gap-2">
                            {u.role === "admin" ? (
                              <Shield className="w-4 h-4 text-amber-500" />
                            ) : (
                              <User className="w-4 h-4 text-blue-500" />
                            )}
                            {u.name || t("users.noName")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3 text-sm">
                          {editingUserId === u.id ? (
                            <Select
                              value={editingRole}
                              onValueChange={(val: any) => setEditingRole(val)}
                            >
                              <SelectTrigger className="w-24 bg-background border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">{t("users.user")}</SelectItem>
                                <SelectItem value="admin">{t("users.admin")}</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                              {u.role === "admin" ? t("users.admin") : t("users.user")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString(
                            language === "ar" ? "ar-SA" : "en-US"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            {editingUserId === u.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleUpdateRole(u.id, editingRole)}
                                  disabled={updateRoleMutation.isPending}
                                  className="text-xs"
                                >
                                  {updateRoleMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    t("common.save")
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingUserId(null)}
                                  className="text-xs"
                                >
                                  {t("common.cancel")}
                                </Button>
                              </>
                            ) : (
                              <>
                                {u.id !== user?.id && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingUserId(u.id);
                                        setEditingRole(u.role);
                                      }}
                                      className="text-xs"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => setDeleteUserId(u.id)}
                                      className="text-xs"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
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
      </div>

      <AlertDialog open={deleteUserId !== null} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t("users.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("users.deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background border-border text-foreground">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && handleDeleteUser(deleteUserId)}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("common.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
