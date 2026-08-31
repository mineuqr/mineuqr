/**
 * CUSTOMER-FOUNDATION-1 — Cashier customer select + create (presentation only).
 * Uses existing Customer domain/API. Does not mutate Collection Fact, PAID,
 * tenders, totals, or sale lines.
 */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  cashierCustomerDisplayLabel,
  type Customer,
  type CustomerType,
} from "@shared/customer";
import { Plus, UserRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [selectOpen, setSelectOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType>("individual");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  const utils = trpc.useUtils();
  const search = trpc.customer.searchForPos.useQuery(
    {
      restaurantId,
      query: query.trim() || undefined,
      limit: 8,
    },
    { enabled: selectOpen && restaurantId > 0 }
  );

  const createMut = trpc.customer.createForPos.useMutation({
    onSuccess: async (customer) => {
      await utils.customer.searchForPos.invalidate();
      onSelect({ id: customer.id, displayName: customer.displayName });
      resetCreateForm();
      setCreateOpen(false);
      setSelectOpen(false);
      toast.success(isAr ? "تم إضافة العميل" : "Customer added");
    },
    onError: (err) => toast.error(err.message),
  });

  function resetCreateForm() {
    setDisplayName("");
    setCustomerType("individual");
    setPhone("");
    setEmail("");
    setAddress("");
    setTaxNumber("");
  }

  function submitCreate() {
    if (displayName.trim().length === 0) {
      toast.error(isAr ? "الاسم مطلوب" : "Name is required");
      return;
    }
    createMut.mutate({
      restaurantId,
      displayName: displayName.trim(),
      customerType,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      taxNumber: taxNumber.trim() || null,
    });
  }

  const label = cashierCustomerDisplayLabel(selected, language);

  return (
    <div className="rounded-xl border border-border/40 bg-[#10141b]/60 px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm text-foreground">
          <UserRound className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate font-medium">{label}</span>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {selected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 min-w-11 px-2"
              onClick={() => {
                onClear();
                setSelectOpen(false);
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
            className="min-h-11"
            onClick={() => {
              setSelectOpen((v) => !v);
              setCreateOpen(false);
            }}
          >
            {isAr ? "اختيار" : "Select"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
              setSelectOpen(false);
            }}
          >
            <Plus className="h-4 w-4 me-1" aria-hidden />
            {isAr ? "إضافة عميل" : "Add customer"}
          </Button>
        </div>
      </div>

      {selectOpen ? (
        <div className="space-y-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? "بحث عن عميل…" : "Search customers…"}
            className="min-h-11"
            autoFocus
            aria-label={isAr ? "بحث عن عميل" : "Search customers"}
          />
          <div className="max-h-40 overflow-y-auto space-y-1">
            {(search.data ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full min-h-11 items-center rounded-lg px-3 text-start text-sm hover:bg-white/5"
                onClick={() => {
                  onSelect({ id: c.id, displayName: c.displayName });
                  setSelectOpen(false);
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

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border/50 bg-[#0f131a] text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAr ? "إضافة عميل" : "Add customer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label htmlFor="cashier-customer-name">
                {isAr ? "الاسم" : "Name"}
              </Label>
              <Input
                id="cashier-customer-name"
                className="mt-2 min-h-11"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={255}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="cashier-customer-type">
                {isAr ? "نوع العميل" : "Customer type"}
              </Label>
              <select
                id="cashier-customer-type"
                className="mt-2 flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={customerType}
                onChange={(e) =>
                  setCustomerType(e.target.value as CustomerType)
                }
              >
                <option value="individual">
                  {isAr ? "فرد" : "Individual"}
                </option>
                <option value="business">
                  {isAr ? "شركة / منشأة" : "Business"}
                </option>
              </select>
            </div>
            <div>
              <Label htmlFor="cashier-customer-phone">
                {isAr ? "الهاتف" : "Phone"}
              </Label>
              <Input
                id="cashier-customer-phone"
                className="mt-2 min-h-11"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                maxLength={32}
              />
            </div>
            <div>
              <Label htmlFor="cashier-customer-email">
                {isAr ? "البريد الإلكتروني" : "Email"}
              </Label>
              <Input
                id="cashier-customer-email"
                className="mt-2 min-h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                maxLength={320}
              />
            </div>
            <div>
              <Label htmlFor="cashier-customer-address">
                {isAr ? "العنوان" : "Address"}
              </Label>
              <Textarea
                id="cashier-customer-address"
                className="mt-2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
              />
            </div>
            <div className="rounded-xl border border-border/30 bg-black/20 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "الرقم الضريبي اختياري. لا يحدد نوع الفاتورة."
                  : "Tax number is optional. It does not set invoice type."}
              </p>
              <Label htmlFor="cashier-customer-tax">
                {isAr ? "الرقم الضريبي (اختياري)" : "Tax number (optional)"}
              </Label>
              <Input
                id="cashier-customer-tax"
                className="mt-2 min-h-11"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                dir="ltr"
                maxLength={64}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                className="min-h-11 flex-1"
                disabled={createMut.isPending || displayName.trim().length === 0}
                onClick={submitCreate}
              >
                {createMut.isPending
                  ? isAr
                    ? "جاري الحفظ…"
                    : "Saving…"
                  : isAr
                    ? "حفظ واختيار"
                    : "Save & select"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={createMut.isPending}
                onClick={() => setCreateOpen(false)}
              >
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
