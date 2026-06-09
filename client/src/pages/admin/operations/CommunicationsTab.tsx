import { useMemo, useState } from "react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Loader2, Mail, Send, Users } from "lucide-react";
import { AdminSection } from "@/components/admin/layout";
import { adminDash } from "@/components/admin/layout/adminDashStyles";

export function CommunicationsTab() {
  const { t, language } = useLanguage();
  const gate = useAuthGate();
  const adminEnabled = adminQueriesEnabled(
    gate.authPending,
    gate.isAuthenticated,
    gate.user?.role === "admin"
  );

  const { data: overviewData } = trpc.admin.getOwnerOverviewList.useQuery(
    { limit: 500 },
    { enabled: adminEnabled }
  );

  const users = useMemo(
    () => (overviewData?.items ?? []).map((item) => item.owner),
    [overviewData]
  );

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userMessage, setUserMessage] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");

  const sendNotifyMutation = trpc.admin.sendCustomNotification.useMutation({
    onSuccess: () => {
      toast.success(
        language === "ar" ? "تم إرسال الإشعار بنجاح" : "Notification sent"
      );
      setUserMessage("");
      setSelectedUserId("");
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || t("common.error"));
    },
  });

  const sendBulkNotifyMutation = trpc.admin.sendBulkNotification.useMutation({
    onSuccess: (data: { sentCount: number }) => {
      toast.success(
        language === "ar"
          ? `تم إرسال الإشعار إلى ${data.sentCount} مستخدم`
          : `Notification sent to ${data.sentCount} users`
      );
      setBulkMessage("");
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || t("common.error"));
    },
  });

  const selectedUser = users.find((u) => String(u.id) === selectedUserId);

  return (
    <AdminSection
      title={t("admin.operations.tabCommunications")}
      description={t("admin.operations.communicationsDesc")}
      icon={Bell}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={adminDash.operationsCard}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Bell className="h-4 w-4 text-amber-500" />
              {t("admin.operations.notifyUserTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">{t("admin.operations.selectUser")}</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="border-border bg-background">
                  <SelectValue placeholder={t("admin.operations.selectUserPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name || u.email || `#${u.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">{t("admin.operations.messageLabel")}</Label>
              <Textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder={t("admin.operations.messagePlaceholder")}
                className="min-h-[100px] border-border bg-background"
                maxLength={500}
              />
              <p className="text-end text-xs text-muted-foreground">{userMessage.length}/500</p>
            </div>
            <Button
              onClick={() => {
                const uid = parseInt(selectedUserId, 10);
                if (!uid || !userMessage.trim()) return;
                sendNotifyMutation.mutate({ userId: uid, message: userMessage.trim() });
              }}
              disabled={
                sendNotifyMutation.isPending || !selectedUserId || !userMessage.trim()
              }
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {sendNotifyMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="me-2 h-4 w-4" />
              )}
              {t("admin.operations.sendNotification")}
              {selectedUser?.name || selectedUser?.email
                ? ` — ${selectedUser.name || selectedUser.email}`
                : ""}
            </Button>
          </CardContent>
        </Card>

        <Card className={adminDash.operationsCard}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Users className="h-4 w-4 text-amber-500" />
              {t("admin.operations.announcementTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("admin.operations.announcementDesc").replace(
                "{count}",
                String(users.length)
              )}
            </p>
            <div className="space-y-2">
              <Label className="text-foreground">{t("admin.operations.messageLabel")}</Label>
              <Textarea
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder={t("admin.operations.bulkMessagePlaceholder")}
                className="min-h-[100px] border-border bg-background"
                maxLength={500}
              />
              <p className="text-end text-xs text-muted-foreground">{bulkMessage.length}/500</p>
            </div>
            <Button
              onClick={() => {
                if (!bulkMessage.trim()) return;
                sendBulkNotifyMutation.mutate({ message: bulkMessage.trim() });
              }}
              disabled={sendBulkNotifyMutation.isPending || !bulkMessage.trim()}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {sendBulkNotifyMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="me-2 h-4 w-4" />
              )}
              {t("admin.operations.sendToAll")}
            </Button>
          </CardContent>
        </Card>

        <Card className={`${adminDash.operationsCard} border-dashed opacity-90`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
              <Mail className="h-4 w-4" />
              {t("admin.operations.emailFutureTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("admin.operations.emailFutureDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminSection>
  );
}
