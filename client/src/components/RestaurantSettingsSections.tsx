import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CountryFinancialPolicySuggestion } from "@/lib/businessTaxPolicySettings";
import { WEEKDAY_KEYS } from "@/lib/restaurantHours";
import { cn } from "@/lib/utils";
import type { CheckTaxMode } from "@shared/operational-session";
import { Clock, Globe, Percent, Store } from "lucide-react";
import type { ReactNode } from "react";

const settingsInput =
  "mt-2 h-11 rounded-xl border-border/45 bg-[#0f131a]/90 text-foreground shadow-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/70 focus-visible:border-primary/45 focus-visible:ring-primary/15 disabled:opacity-45";

const settingsTextarea =
  "mt-2 rounded-xl border-border/45 bg-[#0f131a]/90 text-foreground shadow-none transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:ring-primary/15";

const timeInput =
  "h-11 rounded-xl border-border/45 bg-[#0f131a]/90 text-foreground tabular-nums shadow-none transition-[border-color,box-shadow,background-color] focus-visible:border-primary/45 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-40";

type WorkingHoursState = Record<
  string,
  { open: string; close: string; closed: boolean }
>;

function SettingsSectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Store;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 space-y-1">
        <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h3>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function RestaurantFinancialPolicySection({
  language,
  taxEnabled,
  setTaxEnabled,
  taxRatePercent,
  setTaxRatePercent,
  taxRateError,
  taxMode,
  setTaxMode,
  suggestion,
  onApplySuggestion,
  onDismissSuggestion,
}: {
  language: string;
  taxEnabled: boolean;
  setTaxEnabled: (v: boolean) => void;
  taxRatePercent: string;
  setTaxRatePercent: (v: string) => void;
  taxRateError: string | null;
  taxMode: CheckTaxMode;
  setTaxMode: (v: CheckTaxMode) => void;
  suggestion: CountryFinancialPolicySuggestion | null;
  onApplySuggestion: () => void;
  onDismissSuggestion: () => void;
}) {
  const isAr = language === "ar";

  return (
    <section className="space-y-5 border-t border-border/30 pt-8">
      <SettingsSectionHeader
        icon={Percent}
        title={isAr ? "السياسة المالية" : "Financial Policy"}
        description={
          isAr
            ? "إعدادات الضريبة لشيكات العملاء الجديدة. الشيكات الحالية لا تتأثر."
            : "Tax settings for new customer Checks. Existing Checks are not changed."
        }
      />

      {suggestion ? (
        <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 space-y-3">
          <p className="text-sm text-foreground">
            {isAr
              ? `اقتراح لـ ${suggestion.countryCode}: ضريبة ${suggestion.taxRatePercent}% · الأسعار تشمل الضريبة`
              : `Suggested for ${suggestion.countryCode}: ${suggestion.taxRatePercent}% tax · Prices Include Tax`}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAr
              ? "اقتراح فقط — لن يُطبَّق تلقائياً."
              : "Suggestion only — never applied automatically."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApplySuggestion}
              className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/25"
            >
              {isAr ? "تطبيق الاقتراح" : "Apply suggestion"}
            </button>
            <button
              type="button"
              onClick={onDismissSuggestion}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30"
            >
              {isAr ? "تجاهل" : "Dismiss"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/35 bg-[#10141b]/70 px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <Label className="text-sm font-medium text-foreground">
            {isAr ? "تطبيق الضريبة" : "Apply Tax"}
          </Label>
          <p className="text-xs text-muted-foreground">
            {isAr ? "تفعيل أو تعطيل الضريبة على الشيكات الجديدة" : "Enable or disable tax on new Checks"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
          <span
            className={cn(
              "text-sm font-medium",
              taxEnabled ? "text-primary" : "text-muted-foreground"
            )}
          >
            {taxEnabled
              ? isAr
                ? "مفعّل"
                : "Enabled"
              : isAr
                ? "معطّل"
                : "Disabled"}
          </span>
        </div>
      </div>

      <Field label={isAr ? "نسبة الضريبة (%)" : "Tax Rate (%)"}>
        <Input
          type="text"
          inputMode="decimal"
          value={taxRatePercent}
          onChange={(e) => setTaxRatePercent(e.target.value)}
          placeholder={isAr ? "مثال: 15" : "e.g. 15"}
          className={cn(settingsInput, taxRateError && "border-destructive/60")}
          dir="ltr"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {isAr ? "من 0 إلى 100 — يُسمح بالكسور" : "0–100 — decimals allowed"}
        </p>
        {taxRateError ? (
          <p className="mt-1 text-xs text-destructive">
            {taxRateError === "required"
              ? isAr
                ? "أدخل نسبة الضريبة عند التفعيل."
                : "Enter a tax rate when tax is enabled."
              : taxRateError === "range"
                ? isAr
                  ? "يجب أن تكون النسبة بين 0 و 100."
                  : "Rate must be between 0 and 100."
                : isAr
                  ? "نسبة ضريبة غير صالحة."
                  : "Invalid tax rate."}
          </p>
        ) : null}
      </Field>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          {isAr ? "وضع التسعير" : "Pricing Mode"}
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTaxMode("inclusive")}
            className={cn(
              "rounded-xl border-2 p-3 text-start transition-all",
              taxMode === "inclusive"
                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                : "border-border bg-input hover:border-primary/50"
            )}
          >
            <span className="block text-sm font-medium text-foreground">
              {isAr ? "الأسعار تشمل الضريبة" : "Prices Include Tax"}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {isAr
                ? "أسعار القائمة تشمل الضريبة. يستخرج الشيك مبلغ الضريبة."
                : "Menu prices already include tax. The customer Check extracts the tax amount."}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTaxMode("exclusive")}
            className={cn(
              "rounded-xl border-2 p-3 text-start transition-all",
              taxMode === "exclusive"
                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                : "border-border bg-input hover:border-primary/50"
            )}
          >
            <span className="block text-sm font-medium text-foreground">
              {isAr ? "الأسعار لا تشمل الضريبة" : "Prices Exclude Tax"}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {isAr
                ? "تُضاف الضريبة عند إنشاء الشيك."
                : "Tax is added when generating the Check."}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

export function RestaurantBasicInfoSection({
  t,
  language,
  nameAr,
  setNameAr,
  nameEn,
  setNameEn,
  descriptionAr,
  setDescriptionAr,
  descriptionEn,
  setDescriptionEn,
}: {
  t: (key: string) => string;
  language: string;
  nameAr: string;
  setNameAr: (v: string) => void;
  nameEn: string;
  setNameEn: (v: string) => void;
  descriptionAr: string;
  setDescriptionAr: (v: string) => void;
  descriptionEn: string;
  setDescriptionEn: (v: string) => void;
}) {
  return (
    <section className="space-y-5">
      <SettingsSectionHeader
        icon={Store}
        title={t("dashboard.restaurantData")}
        description={
          language === "ar"
            ? "اسم المطعم ووصفه للزوار"
            : "Restaurant name and public description"
        }
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("dashboard.restaurantNameAr")}>
          <Input
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className={settingsInput}
          />
        </Field>
        <Field label={t("dashboard.restaurantNameEn")}>
          <Input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className={settingsInput}
            dir="ltr"
          />
        </Field>
        <Field label={t("dashboard.descriptionAr2")} className="sm:col-span-2">
          <Textarea
            value={descriptionAr}
            onChange={(e) => setDescriptionAr(e.target.value)}
            className={settingsTextarea}
            rows={3}
          />
        </Field>
        <Field label={t("dashboard.descriptionEn")} className="sm:col-span-2">
          <Textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            className={settingsTextarea}
            rows={3}
            dir="ltr"
          />
        </Field>
      </div>
    </section>
  );
}

export function RestaurantContactLinksSection({
  t,
  language,
  phone,
  setPhone,
  address,
  setAddress,
  whatsapp,
  setWhatsapp,
  locationUrl,
  setLocationUrl,
  instagram,
  setInstagram,
  snapchat,
  setSnapchat,
  xTwitter,
  setXTwitter,
}: {
  t: (key: string) => string;
  language: string;
  phone: string;
  setPhone: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  whatsapp: string;
  setWhatsapp: (v: string) => void;
  locationUrl: string;
  setLocationUrl: (v: string) => void;
  instagram: string;
  setInstagram: (v: string) => void;
  snapchat: string;
  setSnapchat: (v: string) => void;
  xTwitter: string;
  setXTwitter: (v: string) => void;
}) {
  return (
    <section className="space-y-5 border-t border-border/30 pt-8">
      <SettingsSectionHeader
        icon={Globe}
        title={t("dashboard.socialLinks")}
        description={
          language === "ar"
            ? "التواصل، الموقع، وروابط المنصات"
            : "Contact details, location, and social profiles"
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/35 bg-[#10141b]/70 p-5 sm:p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {language === "ar" ? "التواصل والموقع" : "Contact & location"}
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t("dashboard.phone")}>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={settingsInput}
                dir="ltr"
              />
            </Field>
            <Field label={t("dashboard.whatsapp")}>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="966501234567"
                className={settingsInput}
                dir="ltr"
              />
            </Field>
            <Field label={t("dashboard.address")} className="sm:col-span-2">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={settingsInput}
              />
            </Field>
            <Field label={t("dashboard.locationUrl")} className="sm:col-span-2">
              <Input
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className={settingsInput}
                dir="ltr"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-border/35 bg-[#10141b]/70 p-5 sm:p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {language === "ar" ? "منصات التواصل" : "Social platforms"}
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t("dashboard.instagram")}>
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="restaurant_name"
                className={settingsInput}
                dir="ltr"
              />
            </Field>
            <Field label={t("dashboard.snapchat")}>
              <Input
                value={snapchat}
                onChange={(e) => setSnapchat(e.target.value)}
                placeholder="restaurant_snap"
                className={settingsInput}
                dir="ltr"
              />
            </Field>
            <Field label={t("dashboard.xTwitter")} className="sm:col-span-2">
              <Input
                value={xTwitter}
                onChange={(e) => setXTwitter(e.target.value)}
                placeholder="restaurant_x"
                className={settingsInput}
                dir="ltr"
              />
            </Field>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WorkingHoursEditor({
  t,
  language,
  workingHours,
  setWorkingHours,
}: {
  t: (key: string) => string;
  language: string;
  workingHours: WorkingHoursState;
  setWorkingHours: React.Dispatch<React.SetStateAction<WorkingHoursState>>;
}) {
  const timezoneNote =
    language === "ar"
      ? "جميع الأوقات حسب توقيت المطعم"
      : "All times use the restaurant timezone";

  return (
    <section className="space-y-5 border-t border-border/30 pt-8">
      <SettingsSectionHeader
        icon={Clock}
        title={t("dashboard.workingHours")}
        description={timezoneNote}
      />

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border/35 bg-[#10141b]/70 md:block">
        <div className="grid grid-cols-[minmax(9rem,1.15fr)_8.5rem_9.5rem_9.5rem] gap-4 border-b border-border/30 bg-white/[0.02] px-5 py-3.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {language === "ar" ? "اليوم" : "Day"}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {language === "ar" ? "الحالة" : "Status"}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {language === "ar" ? "من" : "From"}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {language === "ar" ? "إلى" : "To"}
          </span>
        </div>

        <div className="divide-y divide-border/25">
          {WEEKDAY_KEYS.map((day) => {
            const dayHours = workingHours[day];
            const isEnabled = !dayHours?.closed;
            const open = dayHours?.open || "09:00";
            const close = dayHours?.close || "23:00";
            const isOvernight = isEnabled && open > close;

            return (
              <div
                key={day}
                className={cn(
                  "grid grid-cols-[minmax(9rem,1.15fr)_8.5rem_9.5rem_9.5rem] items-center gap-4 px-5 py-4 transition-colors",
                  isEnabled ? "hover:bg-white/[0.02]" : "opacity-80"
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{t(`dashboard.days.${day}`)}</p>
                  {isOvernight ? (
                    <p className="mt-1 text-xs text-primary/90">
                      {language === "ar" ? "يمتد لليوم التالي" : "Overnight · closes after midnight"}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2.5">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      setWorkingHours((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], closed: !checked },
                      }))
                    }
                  />
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isEnabled ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {isEnabled
                      ? language === "ar"
                        ? "مفتوح"
                        : "Open"
                      : t("dashboard.closed")}
                  </span>
                </div>

                <Input
                  type="time"
                  value={open}
                  onChange={(e) =>
                    setWorkingHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], open: e.target.value },
                    }))
                  }
                  disabled={!isEnabled}
                  className={cn(timeInput, "w-full max-w-[9.5rem]")}
                  dir="ltr"
                />

                <Input
                  type="time"
                  value={close}
                  onChange={(e) =>
                    setWorkingHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], close: e.target.value },
                    }))
                  }
                  disabled={!isEnabled}
                  className={cn(timeInput, "w-full max-w-[9.5rem]")}
                  dir="ltr"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {WEEKDAY_KEYS.map((day) => {
          const dayHours = workingHours[day];
          const isEnabled = !dayHours?.closed;
          const open = dayHours?.open || "09:00";
          const close = dayHours?.close || "23:00";
          const isOvernight = isEnabled && open > close;

          return (
            <div
              key={day}
              className={cn(
                "rounded-2xl border border-border/35 bg-[#10141b]/70 p-4",
                !isEnabled && "opacity-85"
              )}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{t(`dashboard.days.${day}`)}</p>
                  {isOvernight ? (
                    <p className="mt-1 text-xs text-primary/90">
                      {language === "ar" ? "يمتد لليوم التالي" : "Overnight"}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2.5">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      setWorkingHours((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], closed: !checked },
                      }))
                    }
                  />
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isEnabled ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {isEnabled
                      ? language === "ar"
                        ? "مفتوح"
                        : "Open"
                      : t("dashboard.closed")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={language === "ar" ? "من" : "From"}>
                  <Input
                    type="time"
                    value={open}
                    onChange={(e) =>
                      setWorkingHours((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], open: e.target.value },
                      }))
                    }
                    disabled={!isEnabled}
                    className={cn(timeInput, "w-full")}
                    dir="ltr"
                  />
                </Field>
                <Field label={language === "ar" ? "إلى" : "To"}>
                  <Input
                    type="time"
                    value={close}
                    onChange={(e) =>
                      setWorkingHours((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], close: e.target.value },
                      }))
                    }
                    disabled={!isEnabled}
                    className={cn(timeInput, "w-full")}
                    dir="ltr"
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
