import { useMemo, useState } from "react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
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
import { OperationsTabFrame } from "@/components/admin/operations";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";

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

  const recipientSummary = t("admin.operations.announcementDesc").replace(
    "{count}",
    String(users.length)
  );

  return (
    <OperationsTabFrame
      listLabel={t("admin.operations.tabCommunications")}
      toolbar={
        <p className="text-xs text-muted-foreground">{recipientSummary}</p>
      }
    >
      <div className="grid gap-3 p-3 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Bell className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
            {t("admin.operations.notifyUserTitle")}
          </h3>
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">{t("admin.operations.selectUser")}</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger
                className={cn(adminDash.opsSelect, "w-full border-border bg-background")}
              >
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
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">{t("admin.operations.messageLabel")}</Label>
            <Textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder={t("admin.operations.messagePlaceholder")}
              className="min-h-[80px] border-border bg-background text-sm"
              maxLength={500}
            />
            <p className="text-end text-[11px] text-muted-foreground">{userMessage.length}/500</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const uid = parseInt(selectedUserId, 10);
              if (!uid || !userMessage.trim()) return;
              sendNotifyMutation.mutate({ userId: uid, message: userMessage.trim() });
            }}
            disabled={
              sendNotifyMutation.isPending || !selectedUserId || !userMessage.trim()
            }
            className="h-8 bg-amber-600 text-xs text-white hover:bg-amber-700"
          >
            {sendNotifyMutation.isPending ? (
              <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="me-1.5 h-3.5 w-3.5" />
            )}
            {t("admin.operations.sendNotification")}
            {selectedUser?.name || selectedUser?.email
              ? ` — ${selectedUser.name || selectedUser.email}`
              : ""}
          </Button>
        </section>

        <section className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Users className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
            {t("admin.operations.announcementTitle")}
          </h3>
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">{t("admin.operations.messageLabel")}</Label>
            <Textarea
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
              placeholder={t("admin.operations.bulkMessagePlaceholder")}
              className="min-h-[80px] border-border bg-background text-sm"
              maxLength={500}
            />
            <p className="text-end text-[11px] text-muted-foreground">{bulkMessage.length}/500</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (!bulkMessage.trim()) return;
              sendBulkNotifyMutation.mutate({ message: bulkMessage.trim() });
            }}
            disabled={sendBulkNotifyMutation.isPending || !bulkMessage.trim()}
            className="h-8 bg-amber-600 text-xs text-white hover:bg-amber-700"
          >
            {sendBulkNotifyMutation.isPending ? (
              <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="me-1.5 h-3.5 w-3.5" />
            )}
            {t("admin.operations.sendToAll")}
          </Button>
        </section>

        <section className="space-y-2 rounded-lg border border-dashed border-border/50 bg-muted/5 p-3 opacity-90 lg:col-span-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("admin.operations.emailFutureTitle")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("admin.operations.emailFutureDesc")}</p>
        </section>
      </div>
    </OperationsTabFrame>
  );
}
