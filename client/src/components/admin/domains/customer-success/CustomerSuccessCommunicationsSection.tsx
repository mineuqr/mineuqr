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
import { adminActionBtn, adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";

/** REBUILD-5D — Customer Success communications workspace. */
export function CustomerSuccessCommunicationsSection() {
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

  const broadcastLabel = t("admin.operations.announcementDesc").replace(
    "{count}",
    String(users.length)
  );

  return (
    <OperationsTabFrame
      listLabel={`${t("admin.operations.announcementTitle")} · ${users.length}`}
    >
      <section>
        <div className={adminDash.opsPanelHead}>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
            {t("admin.operations.announcementTitle")}
          </span>
        </div>
        <div className="space-y-1.5 p-2.5 sm:p-3">
          <p className="text-[11px] leading-snug text-muted-foreground">{broadcastLabel}</p>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              {t("admin.operations.messageLabel")}
            </Label>
            <Textarea
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
              placeholder={t("admin.operations.bulkMessagePlaceholder")}
              className="min-h-[56px] resize-y border-border bg-background text-xs"
              maxLength={500}
            />
            <p className="text-end text-[10px] tabular-nums text-muted-foreground">
              {bulkMessage.length}/500
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (!bulkMessage.trim()) return;
              sendBulkNotifyMutation.mutate({ message: bulkMessage.trim() });
            }}
            disabled={sendBulkNotifyMutation.isPending || !bulkMessage.trim()}
            className={cn(adminDash.opBtn, "bg-amber-600 text-white hover:bg-amber-700")}
          >
            {sendBulkNotifyMutation.isPending ? (
              <Loader2 className="me-1.5 h-3 w-3 animate-spin" />
            ) : (
              <Send className="me-1.5 h-3 w-3" />
            )}
            {t("admin.operations.sendToAll")}
          </Button>
        </div>
      </section>

      <section className="border-t border-border/40">
        <div className={adminDash.opsPanelHeadSecondary}>
          <span className="flex items-center gap-1.5">
            <Bell className="h-3 w-3 shrink-0" aria-hidden />
            {t("admin.operations.notifyUserTitle")}
          </span>
        </div>
        <div className="grid gap-1.5 p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end sm:gap-2 sm:p-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              {t("admin.operations.selectUser")}
            </Label>
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
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              {t("admin.operations.messageLabel")}
            </Label>
            <Textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder={t("admin.operations.messagePlaceholder")}
              className="min-h-[40px] resize-none border-border bg-background text-xs sm:min-h-[32px]"
              maxLength={500}
              rows={2}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const uid = parseInt(selectedUserId, 10);
              if (!uid || !userMessage.trim()) return;
              sendNotifyMutation.mutate({ userId: uid, message: userMessage.trim() });
            }}
            disabled={
              sendNotifyMutation.isPending || !selectedUserId || !userMessage.trim()
            }
            className={cn(adminDash.opBtn, adminActionBtn.warning, "w-full sm:w-auto")}
          >
            {sendNotifyMutation.isPending ? (
              <Loader2 className="me-1.5 h-3 w-3 animate-spin" />
            ) : (
              <Send className="me-1.5 h-3 w-3" />
            )}
            <span className="truncate">
              {t("admin.operations.sendNotification")}
            </span>
          </Button>
          <p className="text-end text-[10px] tabular-nums text-muted-foreground sm:col-span-3">
            {userMessage.length}/500
            {selectedUser?.name || selectedUser?.email
              ? ` · ${selectedUser.name || selectedUser.email}`
              : ""}
          </p>
        </div>
      </section>

      <div className="flex items-start gap-1.5 border-t border-dashed border-border/40 px-2.5 py-1.5 sm:px-3">
        <Mail className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-[10px] leading-snug text-muted-foreground">
          <span className="font-medium">{t("admin.operations.emailFutureTitle")}</span>
          {" — "}
          {t("admin.operations.emailFutureDesc")}
        </p>
      </div>
    </OperationsTabFrame>
  );
}
