/**
 * COMMERCIAL-CATALOG-PRODUCTION-POLISH-1
 * Searchable country selector — flag · name · ISO · currency autofill.
 */

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCatalogI18n } from "./useCatalogI18n";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultCurrencyForCountry } from "@shared/commercial-catalog";

function flagEmoji(countryCode: string): string {
  const cc = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + cc.charCodeAt(0) - 65,
    A + cc.charCodeAt(1) - 65
  );
}

export function CatalogCountrySelect(props: {
  value: string;
  onChange: (next: {
    countryCode: string;
    currency: string;
    countryName: string;
  }) => void;
  disabled?: boolean;
}) {
  const { cc, language } = useCatalogI18n();
  const { data: countries = [], isLoading } =
    trpc.countryCurrency.getAll.useQuery();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = countries.map((c) => ({
      code: String(c.countryCode || "").toUpperCase(),
      name:
        language === "ar"
          ? String(c.countryNameAr || c.countryNameEn || c.countryCode)
          : String(c.countryNameEn || c.countryNameAr || c.countryCode),
      currency: String(c.currencyCode || defaultCurrencyForCountry(c.countryCode)),
    }));
    if (!q) return rows.slice(0, 80);
    return rows
      .filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.currency.toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [countries, query, language]);

  const selected = filtered.find((r) => r.code === props.value);

  return (
    <div className="grid gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={cc("polish.countrySearchPlaceholder")}
        aria-label={cc("polish.countrySearchAria")}
        disabled={props.disabled || isLoading}
      />
      <Select
        value={props.value || undefined}
        onValueChange={(code) => {
          const row =
            filtered.find((r) => r.code === code) ||
            countries
              .map((c) => ({
                code: String(c.countryCode || "").toUpperCase(),
                name: String(c.countryNameEn || c.countryCode),
                currency: String(
                  c.currencyCode || defaultCurrencyForCountry(c.countryCode)
                ),
              }))
              .find((r) => r.code === code);
          if (!row) return;
          props.onChange({
            countryCode: row.code,
            currency: row.currency,
            countryName: row.name,
          });
        }}
        disabled={props.disabled || isLoading}
      >
        <SelectTrigger aria-label={cc("polish.countrySelectAria")}>
          <SelectValue placeholder={cc("polish.countrySelectPlaceholder")}>
            {props.value ? (
              <span className="flex items-center gap-2">
                <span aria-hidden>{flagEmoji(props.value)}</span>
                <span>
                  {selected?.name ?? props.value} ({props.value})
                </span>
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {filtered.map((r) => (
            <SelectItem key={r.code} value={r.code}>
              <span className="flex items-center gap-2">
                <span aria-hidden>{flagEmoji(r.code)}</span>
                <span>
                  {r.name} · {r.code} · {r.currency}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
