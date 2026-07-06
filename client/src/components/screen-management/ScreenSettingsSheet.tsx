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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DISPLAY_DENSITY_OPTIONS,
  presenceLabel,
  screenStatusLabel,
  screenTypeLabel,
} from "@/lib/operational-screen/screenLabels";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type ScreenConfigDraft = {
  language: "ar" | "en";
  displayDirection: "rtl" | "ltr";
  displayDensity: "large" | "comfortable" | "compact";
  visibleCategoryIds: number[];
};

export function ScreenSettingsSheet({
  open,
  onOpenChange,
  screenId,
  restaurantId,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenId: string | null;
  restaurantId: number;
  language: string;
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
    { restaurantId, deviceId: screenId ?? "" },
    { enabled: open && screenId != null }
  );
  const screen = screenQuery.data ?? null;

  const categoriesQuery = trpc.category.list.useQuery(
    { restaurantId },
    { enabled: open && restaurantId > 0 }
  );

  const utils = trpc.useUtils();

  const saveMutation = trpc.operationalDevice.management.updateScreenSettings.useMutation({
    onSuccess: () => {
      void utils.operationalDevice.management.list.invalidate({ restaurantId });
      void utils.operationalDevice.management.getHealthSummary.invalidate({ restaurantId });
      void utils.operationalDevice.fleet.getKpis.invalidate({ restaurantId });
      void utils.operationalDevice.fleet.queryScreens.invalidate();
      onOpenChange(false);
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

  if (!screenId) return null;

  if (screenQuery.isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex items-center justify-center sm:max-w-lg">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </SheetContent>
      </Sheet>
    );
  }

  if (!screen) return null;

  const toggleCategory = (categoryId: number, checked: boolean) => {
    setConfig((prev) => ({
      ...prev,
      visibleCategoryIds: checked
        ? [...prev.visibleCategoryIds, categoryId]
        : prev.visibleCategoryIds.filter((id) => id !== categoryId),
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isAr ? "إعدادات الشاشة" : "Screen Settings"}</SheetTitle>
          <SheetDescription>
            {isAr
              ? "إعدادات العرض والتشغيل — لا تؤثر على سلوك الجهاز حتى تفعيل البرامج المستقبلية"
              : "Display and operational settings — runtime behavior unchanged until future programs activate"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-8">
          {/* Screen identity */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {isAr ? "الشاشة" : "Screen"}
            </h3>
            <div className="space-y-2">
              <Label htmlFor="screen-name">{isAr ? "اسم الشاشة" : "Screen name"}</Label>
              <Input id="screen-name" value={screenName} onChange={(e) => setScreenName(e.target.value)} />
            </div>
            <dl className="space-y-2 rounded-xl border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{isAr ? "نوع الشاشة" : "Screen type"}</dt>
                <dd className="font-medium">{screenTypeLabel(screen.role, language)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{isAr ? "الجهاز المرتبط" : "Linked device"}</dt>
                <dd className="max-w-[55%] truncate font-mono text-xs">{screen.deviceId}</dd>
              </div>
            </dl>
          </section>

          {/* Health (read-only) */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {isAr ? "الحالة" : "Health"}
            </h3>
            <dl className="space-y-2 rounded-xl border p-4 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{isAr ? "حالة الجهاز" : "Device status"}</dt>
                <dd>{screenStatusLabel(screen.status, language)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{isAr ? "الاتصال" : "Connection"}</dt>
                <dd>{presenceLabel(screen.presence, language)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{isAr ? "آخر نبض" : "Last heartbeat"}</dt>
                <dd>
                  {screen.lastSeenAt
                    ? new Date(screen.lastSeenAt).toLocaleString(isAr ? "ar-SA" : "en-US")
                    : "—"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Configuration */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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

          {/* Extension: Display density */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {isAr ? "كثافة العرض" : "Display density"}
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {isAr ? "قريباً" : "Saved for later"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "يُفعّل لاحقاً عبر KITCHEN-DISPLAY-DENSITY-1"
                : "Activates later via KITCHEN-DISPLAY-DENSITY-1"}
            </p>
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

          {/* Extension: Visible categories */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {isAr ? "الفئات الظاهرة" : "Visible categories"}
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {isAr ? "محفوظ — بدون تصفية" : "Saved — no filtering yet"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "التصفية تُفعّل لاحقاً عبر KITCHEN-CATEGORY-FILTER-1"
                : "Filtering activates later via KITCHEN-CATEGORY-FILTER-1"}
            </p>
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
        </div>

        <SheetFooter className="mt-8">
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
