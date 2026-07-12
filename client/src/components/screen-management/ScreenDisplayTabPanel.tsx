import { FleetOperatorStatusPill } from "@/components/screen-management/FleetOperatorStatusPill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import {
  DISPLAY_DENSITY_OPTIONS,
  screenTypeLabel,
} from "@/lib/operational-screen/screenLabels";
import {
  formatLastSeen,
  resolveOperatorFleetStatus,
} from "@/lib/screen-management/operatorFleetPresentation";
import {
  categorySectionHint,
  densitySectionHint,
  screenSettingsSheetDescription,
} from "@/lib/screen-management/screenSettingsRuntimeMessaging";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type ScreenConfigDraft = {
  language: "ar" | "en";
  displayDirection: "rtl" | "ltr";
  displayDensity: "large" | "comfortable" | "compact";
  visibleCategoryIds: number[];
};

export function ScreenDisplayTabPanel({
  screenId,
  fleetScreen,
  restaurantId,
  language,
  categorySummary,
  enabled,
  onSaved,
}: {
  screenId: string;
  fleetScreen: FleetScreenReadModel;
  restaurantId: number;
  language: string;
  categorySummary: string | null;
  enabled: boolean;
  onSaved?: () => void;
}) {
  const isAr = language === "ar";
  const [screenName, setScreenName] = useState("");
  const [config, setConfig] = useState<ScreenConfigDraft>({
    language: "ar",
    displayDirection: "rtl",
    displayDensity: "large",
    visibleCategoryIds: [],
  });

  const screenQuery = trpc.operationalDevice.management.get.useQuery(
    { restaurantId, deviceId: screenId },
    { enabled }
  );
  const screen = screenQuery.data ?? null;

  const categoriesQuery = trpc.category.list.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0 }
  );

  const utils = trpc.useUtils();

  const saveMutation = trpc.operationalDevice.management.updateScreenSettings.useMutation({
    onSuccess: () => {
      void utils.operationalDevice.management.list.invalidate({ restaurantId });
      void utils.operationalDevice.management.getHealthSummary.invalidate({ restaurantId });
      void utils.operationalDevice.fleet.getKpis.invalidate({ restaurantId });
      void utils.operationalDevice.fleet.queryScreens.invalidate();
      onSaved?.();
    },
  });

  useEffect(() => {
    if (!screen) return;
    setScreenName(screen.displayName);
    setConfig({
      language: screen.screenConfig?.language ?? "ar",
      displayDirection: screen.screenConfig?.displayDirection ?? "rtl",
      displayDensity: screen.screenConfig?.displayDensity ?? "large",
      visibleCategoryIds: screen.screenConfig?.visibleCategoryIds ?? [],
    });
  }, [screen]);

  if (screenQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!screen) return null;

  const densityHint = densitySectionHint(screen.role, isAr);
  const categoryHint = categorySectionHint(screen.role, isAr);
  const operatorStatus = resolveOperatorFleetStatus(fleetScreen);
  const densityLabel =
    DISPLAY_DENSITY_OPTIONS.find((option) => option.id === config.displayDensity)?.[
      isAr ? "ar" : "en"
    ] ?? config.displayDensity;

  const toggleCategory = (categoryId: number, checked: boolean) => {
    setConfig((prev) => ({
      ...prev,
      visibleCategoryIds: checked
        ? [...prev.visibleCategoryIds, categoryId]
        : prev.visibleCategoryIds.filter((id) => id !== categoryId),
    }));
  };

  return (
    <div className="space-y-8 pb-4">
      <p className="text-sm text-muted-foreground">{screenSettingsSheetDescription(isAr)}</p>

      <section className="space-y-3" aria-labelledby="display-summary-heading">
        <h3
          id="display-summary-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {isAr ? "ملخص التشغيل" : "Operational summary"}
        </h3>
        <dl className="space-y-2 rounded-xl border bg-muted/20 p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "اسم الشاشة" : "Screen name"}</dt>
            <dd className="font-medium">{fleetScreen.displayName}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "دور الشاشة" : "Screen role"}</dt>
            <dd className="font-medium">{screenTypeLabel(fleetScreen.role, language)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "الحالة" : "Status"}</dt>
            <dd>
              <FleetOperatorStatusPill kind={operatorStatus} language={language} />
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "آخر ظهور" : "Last seen"}</dt>
            <dd>{formatLastSeen(fleetScreen.lastHeartbeat, language)}</dd>
          </div>
          {categorySummary ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{isAr ? "الأصناف" : "Items"}</dt>
              <dd className="max-w-[55%] text-end">{categorySummary}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="space-y-4" aria-labelledby="display-identity-heading">
        <h3
          id="display-identity-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {isAr ? "الشاشة" : "Screen"}
        </h3>
        <div className="space-y-2">
          <Label htmlFor="screen-name">{isAr ? "اسم الشاشة" : "Screen name"}</Label>
          <Input id="screen-name" value={screenName} onChange={(e) => setScreenName(e.target.value)} />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="display-config-summary-heading">
        <h3
          id="display-config-summary-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {isAr ? "ملخص الإعداد" : "Configuration summary"}
        </h3>
        <dl className="space-y-2 rounded-xl border p-4 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "اللغة" : "Language"}</dt>
            <dd>{config.language === "ar" ? (isAr ? "العربية" : "Arabic") : "English"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "اتجاه العرض" : "Display direction"}</dt>
            <dd>{config.displayDirection.toUpperCase()}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "كثافة العرض" : "Display density"}</dt>
            <dd>{densityLabel}</dd>
          </div>
          {categorySummary ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{isAr ? "الفئات" : "Categories"}</dt>
              <dd className="max-w-[55%] text-end">{categorySummary}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="space-y-4" aria-labelledby="display-config-heading">
        <h3
          id="display-config-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {isAr ? "الإعدادات" : "Configuration"}
        </h3>
        <div className="space-y-2">
          <Label>{isAr ? "اللغة" : "Language"}</Label>
          <Select
            value={config.language}
            onValueChange={(value: "ar" | "en") => setConfig((prev) => ({ ...prev, language: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">{isAr ? "العربية" : "Arabic"}</SelectItem>
              <SelectItem value="en">{isAr ? "English" : "English"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{isAr ? "اتجاه العرض" : "Display direction"}</Label>
          <Select
            value={config.displayDirection}
            onValueChange={(value: "rtl" | "ltr") =>
              setConfig((prev) => ({ ...prev, displayDirection: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rtl">{isAr ? "من اليمين لليسار (RTL)" : "Right to left (RTL)"}</SelectItem>
              <SelectItem value="ltr">{isAr ? "من اليسار لليمين (LTR)" : "Left to right (LTR)"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {isAr ? "كثافة العرض" : "Display density"}
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {densityHint.badge}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{densityHint.detail}</p>
        <Select
          value={config.displayDensity}
          onValueChange={(value: ScreenConfigDraft["displayDensity"]) =>
            setConfig((prev) => ({ ...prev, displayDensity: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISPLAY_DENSITY_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {isAr ? option.ar : option.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {isAr ? "الفئات الظاهرة" : "Visible categories"}
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {categoryHint.badge}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{categoryHint.detail}</p>
        {categoriesQuery.isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (categoriesQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isAr ? "لا توجد فئات في القائمة." : "No menu categories available."}
          </p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto rounded-xl border p-3">
            {(categoriesQuery.data ?? []).map((category) => {
              const checked = config.visibleCategoryIds.includes(category.id);
              const label = isAr ? category.nameAr : category.nameEn || category.nameAr;
              return (
                <li key={category.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`cat-${category.id}`}
                    checked={checked}
                    onCheckedChange={(value) => toggleCategory(category.id, value === true)}
                  />
                  <Label htmlFor={`cat-${category.id}`} className="cursor-pointer font-normal">
                    {label}
                  </Label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Button
        className="w-full min-h-11"
        disabled={!screenName.trim() || saveMutation.isPending}
        onClick={() =>
          saveMutation.mutate({
            restaurantId,
            deviceId: screen.deviceId,
            displayName: screenName.trim(),
            screenConfig: config,
          })
        }
      >
        {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isAr ? "حفظ الإعدادات" : "Save settings"}
      </Button>
    </div>
  );
}
