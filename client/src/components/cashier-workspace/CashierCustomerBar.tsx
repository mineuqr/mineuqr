/**
 * CUSTOMER-FOUNDATION-1 — Cashier customer select (presentation only).
 * Does not mutate Collection Fact, PAID, tenders, or totals.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  cashierCustomerDisplayLabel,
  type Customer,
} from "@shared/customer";
import { UserRound, X } from "lucide-react";
import { useState } from "react";

export function CashierCustomerBar({
  restaurantId,
  language,
  selected,
  onSelect,
  onClear,
}: {
  restaurantId: number;
  language: "ar" | "en";
  selected: Pick<Customer, "id" | "displayName"> | null;
  onSelect: (customer: Pick<Customer, "id" | "displayName">) => void;
  onClear: () => void;
}) {
  const isAr = language === "ar";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const search = trpc.customer.searchForPos.useQuery(
    {
      restaurantId,
      query: query.trim() || undefined,
      limit: 8,
    },
    { enabled: open && restaurantId > 0 }
  );

  const label = cashierCustomerDisplayLabel(selected, language);

  return (
    <div className="rounded-xl border border-border/40 bg-[#10141b]/60 px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm text-foreground">
          <UserRound className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate font-medium">{label}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          {selected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10 px-2"
              onClick={() => {
                onClear();
                setOpen(false);
                setQuery("");
              }}
              aria-label={isAr ? "مسح العميل" : "Clear customer"}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10"
            onClick={() => setOpen((v) => !v)}
          >
            {isAr ? "اختيار" : "Select"}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="space-y-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? "بحث عن عميل…" : "Search customers…"}
            className="min-h-11"
            autoFocus
          />
          <div className="max-h-40 overflow-y-auto space-y-1">
            {(search.data ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full min-h-11 items-center rounded-lg px-3 text-start text-sm hover:bg-white/5"
                onClick={() => {
                  onSelect({ id: c.id, displayName: c.displayName });
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="truncate">{c.displayName}</span>
              </button>
            ))}
            {!search.isLoading && (search.data?.length ?? 0) === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                {isAr ? "لا نتائج" : "No matches"}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
