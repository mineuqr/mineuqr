import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AuthGatePending, PageDataLoading, SuperAdminAccessDenied } from "@/components/AuthGate";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { isProtectedPlatformAccountUser } from "@shared/platformAccount";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Store, Users, BarChart3, Search, Trash2, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SuperAdminDashboard() {
  const gate = useAuthGate();
  const { user, isAuthenticated, authPending } = gate;
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  const adminEnabled = adminQueriesEnabled(
    authPending,
    isAuthenticated,
    user?.role === "admin"
  );

  const { data: allUsers, isLoading: usersLoading } = trpc.admin.listAllUsers.useQuery(
    undefined,
    { enabled: adminEnabled }
  );

  const { data: stats, isLoading: statsLoading } = trpc.admin.getExtendedStats.useQuery(
    undefined,
    { enabled: adminEnabled }
  );

  // Delete user mutation
  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستخدم بنجاح");
      setDeleteUserId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "فشل حذف المستخدم");
    },
  });

  // Filter users by search term
  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u =>
      (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );
  }, [allUsers, searchTerm]);

  const isLoading = usersLoading || statsLoading;

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <SuperAdminAccessDenied />;
  }

  return (
    <div className="min-h-screen cinematic-bg">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">لوحة المسؤول الأعلى</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="text-foreground"
          >
            العودة
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المطاعم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.totalRestaurants}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المستخدمين</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.totalUsers}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الأصناف</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.totalCategories}</div>
              </CardContent>
            </Card>



            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي العروض</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.totalOffers}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                إدارة المستخدمين ({filteredUsers.length})
              </CardTitle>
            </div>
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن المستخدمين..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border text-foreground"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد مستخدمين
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-right py-3 px-4 font-semibold text-foreground">الاسم</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">البريد الإلكتروني</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">الدور</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">طريقة التسجيل</th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 text-foreground">{u.name || 'بدون اسم'}</td>
                        <td className="py-3 px-4 text-muted-foreground">{u.email || 'بدون بريد'}</td>
                        <td className="py-3 px-4">
                          <Badge className={u.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}>
                            {u.role === 'admin' ? 'مسؤول' : 'مستخدم'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{u.loginMethod}</td>
                        <td className="py-3 px-4 text-center">
                          {!isProtectedPlatformAccountUser(u) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteUserId(u.id)}
                              className="text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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

      {/* Delete User Dialog */}
      <AlertDialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteUserId) {
                  deleteUserMutation.mutate({ userId: deleteUserId });
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'حذف'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
