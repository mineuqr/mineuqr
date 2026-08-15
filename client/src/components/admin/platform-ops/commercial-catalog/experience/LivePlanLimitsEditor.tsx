/**
 * COMMERCIAL-LIVE-PLANS-LIMITS-REPAIR-1 — Live Plan limit values (not capabilities).
 */
import { LIVE_PLAN_LIMIT_KEYS } from "@shared/commercial-catalog";
import { Checkbox } from "@/components/ui/checkbox";
import { CatalogField, Input } from "../CatalogFormDialog";
import { catalogLimitNameKey, resolveCatalogLabel } from "../catalogCommercialDisplay";
import { useCatalogI18n } from "../useCatalogI18n";

export type LivePlanLimitDraft = {
  limitKey: string;
  value: number | null;
};

export function limitsFromProfileValues(
  values: Array<{ limitKey: string; value: number | null }> | undefined
): LivePlanLimitDraft[] {
  const map = new Map((values ?? []).map((v) => [v.limitKey, v.value] as const));
  return LIVE_PLAN_LIMIT_KEYS.map((limitKey) => ({
    limitKey,
    value: map.has(limitKey) ? (map.get(limitKey) ?? null) : 0,
  }));
}

export function LivePlanLimitsEditor(props: {
  value: LivePlanLimitDraft[];
  onChange: (next: LivePlanLimitDraft[]) => void;
  error?: string | null;
}) {
  const { cc, t } = useCatalogI18n();

  function patch(limitKey: string, next: Partial<LivePlanLimitDraft>) {
    props.onChange(
      props.value.map((row) =>
        row.limitKey === limitKey ? { ...row, ...next } : row
      )
    );
  }

  return (
    <div className="space-y-3">
      {props.value.map((row) => {
        const unlimited = row.value === null;
        return (
          <CatalogField
            key={row.limitKey}
            label={resolveCatalogLabel(t, catalogLimitNameKey(row.limitKey), row.limitKey)}
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <Checkbox
                  checked={!unlimited}
                  onCheckedChange={(c) =>
                    patch(row.limitKey, { value: c ? 0 : null })
                  }
                />
                {cc("experience.livePlans.limited")}
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                disabled={unlimited}
                value={unlimited ? "" : String(row.value ?? 0)}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    patch(row.limitKey, { value: 0 });
                    return;
                  }
                  const n = Number(raw);
                  patch(row.limitKey, { value: Number.isFinite(n) ? n : 0 });
                }}
              />
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <Checkbox
                  checked={unlimited}
                  onCheckedChange={(c) =>
                    patch(row.limitKey, { value: c ? null : 0 })
                  }
                />
                {cc("common.unlimited")}
              </label>
            </div>
          </CatalogField>
        );
      })}
      {props.error ? (
        <p className="text-sm text-destructive">{props.error}</p>
      ) : null}
    </div>
  );
}
