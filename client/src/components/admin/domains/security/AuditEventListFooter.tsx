import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { adminDash } from "@/components/admin/layout/adminDashStyles";

type AuditEventListFooterProps = {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

export function AuditEventListFooter({
  hasMore,
  isLoadingMore,
  onLoadMore,
}: AuditEventListFooterProps) {
  const { t } = useLanguage();

  if (!hasMore) return null;

  return (
    <div className="flex justify-center border-t border-cyan-500/15 px-2 py-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={adminDash.opBtn}
        disabled={isLoadingMore}
        onClick={onLoadMore}
      >
        {isLoadingMore ? (
          <>
            <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            {t("admin.security.timeline.loadingMore")}
          </>
        ) : (
          t("admin.security.timeline.loadMore")
        )}
      </Button>
    </div>
  );
}
