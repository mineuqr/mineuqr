/**
 * CUSTOMER-FOUNDATION-1 — Restaurant Customer Management (global, not Saudi-specific).
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import type { CustomerType } from "@shared/customer";
import { Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type FilterKind = "all" | "individual" | "business";

export function CustomersTab({ restaurantId }: { restaurantId: number }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [filter, setFilter] = useState<FilterKind>("all");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType>("individual");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  const utils = trpc.useUtils();
  const listQuery = trpc.customer.list.useQuery(
    {
      restaurantId,
      query: query.trim() || undefined,
      customerType: filter === "all" ? undefined : filter,
      status: "active",
      limit: 100,
    },
    { enabled: restaurantId > 0 }
  );

  const createMut = trpc.customer.create.useMutation({
    onSuccess: async () => {
      await utils.customer.list.invalidate();
      resetForm();
      toast.success(isAr ? "تم إنشاء العميل" : "Customer created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.customer.update.useMutation({
    onSuccess: async () => {
      await utils.customer.list.invalidate();
      resetForm();
      toast.success(isAr ? "تم تحديث العميل" : "Customer updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveMut = trpc.customer.update.useMutation({
    onSuccess: async () => {
      await utils.customer.list.invalidate();
      toast.success(isAr ? "تم أرشفة العميل" : "Customer archived");
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setDisplayName("");
    setCustomerType("individual");
    setPhone("");
    setEmail("");
    setAddress("");
    setTaxNumber("");
  }

  function startEdit(c: {
    id: number;
    displayName: string;
    customerType: CustomerType;
    phone: string | null;
    email: string | null;
    address: string | null;
    taxNumber: string | null;
  }) {
    setEditingId(c.id);
    setDisplayName(c.displayName);
    setCustomerType(c.customerType);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setAddress(c.address ?? "");
    setTaxNumber(c.taxNumber ?? "");
    setShowForm(true);
  }

  function submit() {
    if (displayName.trim().length === 0) {
      toast.error(isAr ? "الاسم مطلوب" : "Name is required");
      return;
    }
    const payload = {
      restaurantId,
      displayName: displayName.trim(),
      customerType,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      taxNumber: taxNumber.trim() || null,
    };
    if (editingId != null) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const filters = useMemo(
    () =>
      [
        { id: "all" as const, label: isAr ? "الكل" : "All" },
        { id: "individual" as const, label: isAr ? "أفراد" : "Individuals" },
        { id: "business" as const, label: isAr ? "شركات" : "Businesses" },
      ] as const,
    [isAr]
  );

  const customers = listQuery.data ?? [];

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isAr ? "العملاء" : "Customers"}
            </h2>
            <p className="text-sm text-slate-400">
              {isAr
                ? "إدارة عملاء المطعم. الرقم الضريبي اختياري — لا يحدد نوع الفاتورة."
                : "Restaurant customer management. Tax number is optional — it does not set invoice type."}
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="min-h-11"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 me-2" />
          {isAr ? "عميل جديد" : "New customer"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`min-h-11 rounded-xl border px-4 text-sm transition-colors ${
              filter === f.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 text-slate-300 hover:bg-white/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 start-3" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isAr ? "بحث بالاسم أو الهاتف…" : "Search name or phone…"}
          className="min-h-11 ps-10"
        />
      </div>

      {showForm ? (
        <section className="space-y-4 rounded-2xl border border-border/40 bg-[#10141b]/80 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-foreground">
            {editingId
              ? isAr
                ? "تعديل العميل"
                : "Edit customer"
              : isAr
                ? "عميل جديد"
                : "New customer"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>{isAr ? "الاسم" : "Name"}</Label>
              <Input
                className="mt-2 min-h-11"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={255}
              />
            </div>
            <div>
              <Label>{isAr ? "نوع العميل" : "Customer type"}</Label>
              <select
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
              <Label>{isAr ? "الهاتف" : "Phone"}</Label>
              <Input
                className="mt-2 min-h-11"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                maxLength={32}
              />
            </div>
            <div>
              <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
              <Input
                className="mt-2 min-h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                maxLength={320}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>{isAr ? "العنوان" : "Address"}</Label>
              <Textarea
                className="mt-2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="rounded-xl border border-border/30 bg-black/20 p-3 space-y-2">
            <p className="text-sm font-medium text-foreground">
              {isAr
                ? "معلومات امتثال اختيارية"
                : "Optional compliance information"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "الرقم الضريبي اختياري دائمًا في طبقة العميل. لا يحدد نوع الفاتورة."
                : "Tax number is always optional at the Customer layer. It does not determine invoice type."}
            </p>
            <Label>{isAr ? "الرقم الضريبي (اختياري)" : "Tax number (optional)"}</Label>
            <Input
              className="mt-2 min-h-11"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              dir="ltr"
              maxLength={64}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-11"
              disabled={createMut.isPending || updateMut.isPending}
              onClick={submit}
            >
              {isAr ? "حفظ" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={resetForm}
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
          </div>
        </section>
      ) : null}

      <div className="space-y-2">
        {listQuery.isLoading ? (
          <p className="text-sm text-slate-400">
            {isAr ? "جاري التحميل…" : "Loading…"}
          </p>
        ) : customers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/40 px-4 py-8 text-center text-sm text-slate-400">
            {isAr ? "لا يوجد عملاء بعد." : "No customers yet."}
          </p>
        ) : (
          customers.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-border/35 bg-[#10141b]/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {c.displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.customerType === "business"
                    ? isAr
                      ? "شركة"
                      : "Business"
                    : isAr
                      ? "فرد"
                      : "Individual"}
                  {c.phone ? ` · ${c.phone}` : ""}
                  {c.taxNumber ? ` · ${c.taxNumber}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => startEdit(c)}
                >
                  {isAr ? "تعديل" : "Edit"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 text-muted-foreground"
                  onClick={() =>
                    archiveMut.mutate({
                      id: c.id,
                      restaurantId,
                      status: "archived",
                    })
                  }
                >
                  {isAr ? "أرشفة" : "Archive"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
