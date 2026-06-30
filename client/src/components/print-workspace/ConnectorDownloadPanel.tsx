import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

export function ConnectorDownloadPanel({
  restaurantId,
  language,
  onPaired,
}: {
  restaurantId: number;
  language: string;
  onPaired?: () => void;
}) {
  const isAr = language === "ar";
  const [copied, setCopied] = useState(false);

  const downloadQuery = trpc.printWorkspace.read.getConnectorDownload.useQuery({ restaurantId });
  const pairingQuery = trpc.printWorkspace.read.getConnectorPairing.useQuery(
    { restaurantId },
    { enabled: restaurantId > 0, refetchInterval: 60_000 }
  );

  const handleCopyCode = async () => {
    const token = pairingQuery.data?.pairingToken;
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadUrl = downloadQuery.data?.downloadUrl;
  const pairingToken = pairingQuery.data?.pairingToken;

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">
            {downloadQuery.data?.productName ?? "MineuQR Connector"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isAr ? "الإصدار" : "Version"} {downloadQuery.data?.version ?? "—"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            void downloadQuery.refetch();
            void pairingQuery.refetch();
          }}
          disabled={downloadQuery.isFetching || pairingQuery.isFetching}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4",
              (downloadQuery.isFetching || pairingQuery.isFetching) && "animate-spin"
            )}
          />
        </Button>
      </div>

      {downloadUrl ? (
        <Button type="button" asChild className="w-full sm:w-auto">
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 me-1" />
            {isAr ? "تنزيل موصل MineuQR" : "Download MineuQR Connector"}
          </a>
        </Button>
      ) : (
        <p className="text-sm text-slate-400">
          {isAr
            ? "رابط التنزيل سيظهر هنا عند توفر المثبّت."
            : "The download link will appear here when the installer is published."}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-200">
          {isAr ? "رمز الربط" : "Pairing code"}
        </p>
        <p className="text-xs leading-relaxed text-slate-400">
          {isAr
            ? "بعد التثبيت، أدخل هذا الرمز في تطبيق الموصل لربط المطعم."
            : "After installing, enter this code in the connector app to link your restaurant."}
        </p>
        {pairingQuery.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        ) : pairingToken ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm tracking-widest text-emerald-300">
              {pairingToken}
            </code>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyCode()}>
              {copied ? (isAr ? "تم النسخ" : "Copied") : isAr ? "نسخ" : "Copy"}
            </Button>
          </div>
        ) : null}
        {pairingQuery.data?.expiresAt ? (
          <p className="text-xs text-slate-500">
            {isAr ? "ينتهي في " : "Expires "}
            {new Date(pairingQuery.data.expiresAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
          </p>
        ) : null}
      </div>

      {onPaired ? (
        <Button type="button" size="sm" variant="outline" onClick={onPaired}>
          {isAr ? "تم الربط — إعادة المحاولة" : "I paired it — Retry"}
        </Button>
      ) : null}
    </div>
  );
}
