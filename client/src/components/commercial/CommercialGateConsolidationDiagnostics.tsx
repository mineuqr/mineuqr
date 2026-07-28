import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  SemanticTableScroll,
  SemanticTableRoot,
  SemanticTableHeader,
  SemanticTableBody,
  SemanticTableRow,
  SemanticTableHead,
  SemanticTableCell,
} from "@/design-system/semantic-table";
import {
  SemanticBadge,
  mapGateStatusToBadgeTone,
} from "@/design-system/semantic-badge";
import {
  CLIENT_GATE_REGISTRY,
  getClientGateConsolidationStats,
  type ClientGateStatus,
} from "@/lib/commercial/clientGateRegistry";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";

type CommercialGateConsolidationDiagnosticsProps = {
  language: CommercialUiLanguage;
};

const STATUS_LABELS: Record<ClientGateStatus, { en: string; ar: string }> = {
  MIGRATED: { en: "Migrated", ar: "مُهاجَر" },
  ACTIVE: { en: "Active", ar: "نشط" },
  NEEDS_MIGRATION: { en: "Needs migration", ar: "يحتاج هجرة" },
  REDUNDANT: { en: "Redundant", ar: "مكرر" },
  KEEP_TEMPORARY: { en: "Keep temporary", ar: "مؤقت" },
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
        <SemanticTableScroll>
          <SemanticTableRoot density="comfortable" className="text-left">
            <SemanticTableHeader density="comfortable">
              <SemanticTableRow density="comfortable">
                <SemanticTableHead density="comfortable" className="pr-4">
                  ID
                </SemanticTableHead>
                <SemanticTableHead density="comfortable" className="pr-4">
                  {language === "ar" ? "الملف" : "File"}
                </SemanticTableHead>
                <SemanticTableHead density="comfortable" className="pr-4">
                  {language === "ar" ? "القديم" : "Legacy"}
                </SemanticTableHead>
                <SemanticTableHead density="comfortable" className="pr-4">
                  {language === "ar" ? "المسار" : "Authority"}
                </SemanticTableHead>
                <SemanticTableHead density="comfortable">
                  {language === "ar" ? "الحالة" : "Status"}
                </SemanticTableHead>
              </SemanticTableRow>
            </SemanticTableHeader>
            <SemanticTableBody>
              {entries.map((entry) => {
                const statusMeta = STATUS_LABELS[entry.status];
                return (
                  <SemanticTableRow
                    key={entry.id}
                    density="comfortable"
                    className="align-top"
                  >
                    <SemanticTableCell density="comfortable" className="pr-4 font-mono text-xs">
                      {entry.id}
                    </SemanticTableCell>
                    <SemanticTableCell density="comfortable" className="pr-4 font-mono text-xs">
                      {entry.file.split("/").pop()}
                    </SemanticTableCell>
                    <SemanticTableCell
                      density="comfortable"
                      className="max-w-[180px] pr-4 text-xs text-muted-foreground"
                    >
                      {entry.legacyLogic}
                    </SemanticTableCell>
                    <SemanticTableCell density="comfortable" className="pr-4 text-xs">
                      {entry.authorityPath}
                    </SemanticTableCell>
                    <SemanticTableCell density="comfortable">
                      <SemanticBadge
                        tone={mapGateStatusToBadgeTone(entry.status)}
                        className="text-xs"
                      >
                        {language === "ar" ? statusMeta.ar : statusMeta.en}
                      </SemanticBadge>
                    </SemanticTableCell>
                  </SemanticTableRow>
                );
              })}
            </SemanticTableBody>
          </SemanticTableRoot>
        </SemanticTableScroll>
      </CardContent>
    </Card>
  );
}
