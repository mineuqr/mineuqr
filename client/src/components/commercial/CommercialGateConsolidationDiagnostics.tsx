import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CLIENT_GATE_REGISTRY,
  getClientGateConsolidationStats,
  type ClientGateStatus,
} from "@/lib/commercial/clientGateRegistry";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";

type CommercialGateConsolidationDiagnosticsProps = {
  language: CommercialUiLanguage;
};

const STATUS_LABELS: Record<
  ClientGateStatus,
  { en: string; ar: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  MIGRATED: { en: "Migrated", ar: "مُهاجَر", variant: "default" },
  ACTIVE: { en: "Active", ar: "نشط", variant: "secondary" },
  NEEDS_MIGRATION: { en: "Needs migration", ar: "يحتاج هجرة", variant: "destructive" },
  REDUNDANT: { en: "Redundant", ar: "مكرر", variant: "outline" },
  KEEP_TEMPORARY: { en: "Keep temporary", ar: "مؤقت", variant: "outline" },
};

/** PG-1C.3C — consolidation progress and legacy gate inventory. */
export function CommercialGateConsolidationDiagnostics({
  language,
}: CommercialGateConsolidationDiagnosticsProps) {
  const stats = getClientGateConsolidationStats();
  const legacyGates = CLIENT_GATE_REGISTRY.filter(
    (e) => e.status === "NEEDS_MIGRATION" || e.status === "REDUNDANT"
  );
  const migratedGates = CLIENT_GATE_REGISTRY.filter((e) => e.status === "MIGRATED");

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">
            {language === "ar"
              ? "تقدم توحيد بوابات العميل (PG-1C.3C)"
              : "Client gate consolidation (PG-1C.3C)"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {language === "ar"
              ? "مسار السلطة: useCommercialFeatureVisibility() → featureVisibility.ts"
              : "Authority path: useCommercialFeatureVisibility() → featureVisibility.ts"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatBox
              label={language === "ar" ? "مُهاجَر" : "Migrated"}
              value={stats.migrated}
            />
            <StatBox
              label={language === "ar" ? "قديم" : "Legacy"}
              value={stats.legacy}
            />
            <StatBox
              label={language === "ar" ? "مؤقت" : "Temporary"}
              value={stats.temporary}
            />
            <StatBox
              label={language === "ar" ? "الإجمالي" : "Total"}
              value={stats.total}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === "ar" ? "نسبة الإكمال" : "Consolidation progress"}
              </span>
              <span className="font-medium">{stats.progressPct}%</span>
            </div>
            <Progress value={stats.progressPct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {legacyGates.length > 0 && (
        <GateTable
          title={
            language === "ar"
              ? "بوابات قديمة متبقية"
              : "Remaining legacy gates"
          }
          entries={legacyGates}
          language={language}
        />
      )}

      <GateTable
        title={
          language === "ar"
            ? "بوابات مُهاجَرة"
            : "Migrated gates"
        }
        entries={migratedGates}
        language={language}
      />

      <GateTable
        title={
          language === "ar"
            ? "بوابات مؤقتة / نشطة"
            : "Temporary / active gates"
        }
        entries={CLIENT_GATE_REGISTRY.filter(
          (e) => e.status === "KEEP_TEMPORARY" || e.status === "ACTIVE"
        )}
        language={language}
      />
    </div>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function GateTable({
  title,
  entries,
  language,
}: {
  title: string;
  entries: typeof CLIENT_GATE_REGISTRY;
  language: CommercialUiLanguage;
}) {
  if (entries.length === 0) return null;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">{language === "ar" ? "الملف" : "File"}</th>
                <th className="py-2 pr-4">{language === "ar" ? "القديم" : "Legacy"}</th>
                <th className="py-2 pr-4">{language === "ar" ? "المسار" : "Authority"}</th>
                <th className="py-2">{language === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const statusMeta = STATUS_LABELS[entry.status];
                return (
                  <tr key={entry.id} className="border-b border-border/50 align-top">
                    <td className="py-2 pr-4 font-mono text-xs">{entry.id}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {entry.file.split("/").pop()}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground max-w-[180px]">
                      {entry.legacyLogic}
                    </td>
                    <td className="py-2 pr-4 text-xs">{entry.authorityPath}</td>
                    <td className="py-2">
                      <Badge variant={statusMeta.variant} className="text-xs">
                        {language === "ar" ? statusMeta.ar : statusMeta.en}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
