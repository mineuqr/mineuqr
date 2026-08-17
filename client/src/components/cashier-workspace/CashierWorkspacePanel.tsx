/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1
 * Restaurant Dashboard cashier workspace. Presentation + existing POS tRPC only.
 * Does not own Order, Check, Settlement, Register, or Reporting.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import {
  AppEmptyState,
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from "@/components/app-state";
import { Button } from "@/components/ui/button";
import { newCashierIdempotencyKey } from "@/lib/cashier-workspace/cashierIdempotency";
import {
  cashierUiLabel,
  type CashierLang,
} from "@/lib/cashier-workspace/cashierCopy";
import { cashierPos } from "@/lib/cashier-workspace/cashierPosStyles";
import {
  classifyCashierRegisterGap,
  type CashierRegisterGapKind,
} from "@/lib/cashier-workspace/cashierRegisterGap";
import {
  isCashierTerminalId,
  readCashierTerminalId,
  writeCashierTerminalId,
} from "@/lib/cashier-workspace/cashierTerminalStorage";
import {
  displayMoneyTimesQuantity,
  displayTicketTotal,
} from "@/lib/cashier-workspace/cashierTicketTotals";
import {
  tryOpenCashierNewTab,
} from "@/lib/cashier-workspace/cashierWorkspaceNav";
import { CASHIER_V1_PERMISSIONS } from "@/lib/cashier-workspace/cashierWorkspacePermissions";
import { syncDashboardUrl } from "@/lib/dashboardUrl";
import { listMonetaryPaymentMethodOptions } from "@/lib/settlementPaymentMethodPresentation";
import { formatTrpcErrorForUser } from "@/lib/trpcErrors";
import { classifyQueryError } from "@/lib/ui-state/classifyQueryError";
import { trpc } from "@/lib/trpc";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { SelectablePaymentMethod } from "@shared/operational-session";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type TicketLine = {
  menuItemId: number;
  nameAr: string;
  nameEn: string | null;
  price: string;
  quantity: number;
};

type OpenCheckResult = {
  checkId: number;
  orderId: number;
  outcome: "open";
  replayed: boolean;
};

type PaidCheckoutResult = {
  checkId: number;
  orderId: number;
  grandTotal: string;
  settlementRecordId: string | null;
  paymentMethod: SelectablePaymentMethod;
};

type Props = {
  restaurantId: number;
  language: CashierLang;
  restaurantName?: string | null;
};

function isForbidden(error: unknown): boolean {
  return classifyQueryError(error) === "forbidden";
}

function userFacingError(error: unknown, fallback: string): string {
  return formatTrpcErrorForUser(error, () => fallback);
}

function categoryLabel(
  language: CashierLang,
  nameAr: string | null,
  nameEn: string | null,
  unknownLabel: string
): string {
  if (language === "ar") return nameAr || nameEn || unknownLabel;
  return nameEn || nameAr || unknownLabel;
}

export function CashierWorkspacePanel({
  restaurantId,
  language,
  restaurantName,
}: Props) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const t = (key: Parameters<typeof cashierUiLabel>[0]) =>
    cashierUiLabel(key, language);
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [terminalId, setTerminalId] = useState<string | null>(() =>
    readCashierTerminalId(restaurantId)
  );
  const [ticket, setTicket] = useState<TicketLine[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [openCheck, setOpenCheck] = useState<OpenCheckResult | null>(null);
  const [paidCheckout, setPaidCheckout] = useState<PaidCheckoutResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<SelectablePaymentMethod | null>(
    null
  );
  const [registerGap, setRegisterGap] = useState<CashierRegisterGapKind | null>(
    null
  );

  useEffect(() => {
    setTerminalId(readCashierTerminalId(restaurantId));
    setTicket([]);
    setSelectedOrderId(null);
    setCategoryFilter("all");
    setOpenCheck(null);
    setPaidCheckout(null);
    setPaymentMethod(null);
    setRegisterGap(null);
  }, [restaurantId]);

  const terminalsQuery = trpc.pos.terminal.list.useQuery(
    { restaurantId },
    { enabled: restaurantId > 0 }
  );
  const activeTerminals = useMemo(
    () => (terminalsQuery.data ?? []).filter((row) => row.lifecycle === "active"),
    [terminalsQuery.data]
  );
  const activatableTerminals = useMemo(
    () =>
      (terminalsQuery.data ?? []).filter(
        (row) => row.lifecycle === "registered" || row.lifecycle === "deactivated"
      ),
    [terminalsQuery.data]
  );

  useEffect(() => {
    if (!terminalsQuery.data || terminalId) return;
    const first = activeTerminals[0];
    if (first) {
      setTerminalId(first.id);
      writeCashierTerminalId(restaurantId, first.id);
    }
  }, [activeTerminals, restaurantId, terminalId, terminalsQuery.data]);

  const scoped = isCashierTerminalId(terminalId);
  const accessQuery = trpc.pos.access.context.useQuery(
    { restaurantId, terminalId: terminalId ?? "" },
    { enabled: scoped }
  );
  const allowed = accessQuery.data?.allowed === true;

  const catalogQuery = trpc.pos.read.catalog.listItems.useQuery(
    { restaurantId, terminalId: terminalId ?? "", availableOnly: true },
    { enabled: scoped && allowed }
  );
  const ordersQuery = trpc.pos.read.orders.listActive.useQuery(
    { restaurantId, terminalId: terminalId ?? "", status: "all-active", limit: 50 },
    { enabled: scoped && allowed, staleTime: 0 }
  );
  const detailQuery = trpc.pos.read.orders.getDetail.useQuery(
    {
      restaurantId,
      terminalId: terminalId ?? "",
      orderId: selectedOrderId ?? 0,
    },
    { enabled: scoped && allowed && selectedOrderId != null }
  );
  const timelineQuery = trpc.pos.read.orders.getTimeline.useQuery(
    {
      restaurantId,
      terminalId: terminalId ?? "",
      orderId: selectedOrderId ?? 0,
    },
    { enabled: scoped && allowed && selectedOrderId != null }
  );
  const settlementQuery = trpc.pos.read.orderSettlement.listByOrder.useQuery(
    {
      restaurantId,
      terminalId: terminalId ?? "",
      orderId: selectedOrderId ?? 0,
    },
    { enabled: scoped && allowed && selectedOrderId != null }
  );

  const grantMutation = trpc.pos.access.grant.useMutation();
  const registerMutation = trpc.pos.terminal.register.useMutation();
  const activateMutation = trpc.pos.terminal.activate.useMutation();
  const saleMutation = trpc.pos.sale.create.useMutation();
  const intakeMutation = trpc.pos.check.intake.useMutation();
  const settleMutation = trpc.pos.settlement.initiate.useMutation();

  function invalidateOrderReads() {
    void utils.pos.read.orders.listActive.invalidate();
    void utils.pos.read.orders.getDetail.invalidate();
    void utils.pos.read.orders.getTimeline.invalidate();
    void utils.pos.read.orderSettlement.listByOrder.invalidate();
  }

  async function enableCashierAccess() {
    if (!user?.id) return;
    try {
      for (const permission of CASHIER_V1_PERMISSIONS) {
        await grantMutation.mutateAsync({
          restaurantId,
          userId: user.id,
          permission,
        });
      }
      await accessQuery.refetch();
      invalidateOrderReads();
      void utils.pos.read.catalog.listItems.invalidate();
    } catch (error) {
      toast.error(userFacingError(error, t("errorTitle")));
    }
  }

  async function ensureTerminal() {
    try {
      const existing = activatableTerminals[0];
      const created = existing
        ? existing
        : await registerMutation.mutateAsync({ restaurantId });
      const active = await activateMutation.mutateAsync({
        restaurantId,
        terminalId: created.id,
      });
      setTerminalId(active.id);
      writeCashierTerminalId(restaurantId, active.id);
      await terminalsQuery.refetch();
      await accessQuery.refetch();
    } catch (error) {
      toast.error(userFacingError(error, t("errorTitle")));
    }
  }

  function addItem(item: {
    menuItemId: number;
    nameAr: string;
    nameEn: string | null;
    price: string;
  }) {
    setTicket((current) => {
      const existing = current.find((line) => line.menuItemId === item.menuItemId);
      if (!existing) return [...current, { ...item, quantity: 1 }];
      return current.map((line) =>
        line.menuItemId === item.menuItemId
          ? { ...line, quantity: line.quantity + 1 }
          : line
      );
    });
  }

  function changeQty(menuItemId: number, delta: number) {
    setTicket((current) =>
      current
        .map((line) =>
          line.menuItemId === menuItemId
            ? { ...line, quantity: line.quantity + delta }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }

  function selectOrder(orderId: number) {
    setSelectedOrderId(orderId);
    setOpenCheck(null);
    setPaidCheckout(null);
    setPaymentMethod(null);
    setRegisterGap(null);
  }

  function startNewSale() {
    setTicket([]);
    setSelectedOrderId(null);
    setOpenCheck(null);
    setPaidCheckout(null);
    setPaymentMethod(null);
    setRegisterGap(null);
  }

  async function placeSale() {
    if (!terminalId || ticket.length === 0) return;
    try {
      const result = await saleMutation.mutateAsync({
        restaurantId,
        terminalId,
        items: ticket.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
        })),
        idempotencyKey: newCashierIdempotencyKey("sale"),
      });
      setTicket([]);
      setSelectedOrderId(result.orderId);
      setOpenCheck(null);
      setPaidCheckout(null);
      setPaymentMethod(null);
      setRegisterGap(null);
      toast.success(`${t("salePlaced")} ${result.displayReference}`);
      invalidateOrderReads();
    } catch (error) {
      toast.error(userFacingError(error, t("errorTitle")));
    }
  }

  async function intakeCheck() {
    if (!terminalId || selectedOrderId == null) return;
    try {
      const result = await intakeMutation.mutateAsync({
        restaurantId,
        terminalId,
        orderId: selectedOrderId,
        idempotencyKey: newCashierIdempotencyKey("check"),
      });
      setOpenCheck({
        checkId: result.checkId,
        orderId: result.orderId,
        outcome: result.outcome,
        replayed: result.replayed,
      });
      setPaidCheckout(null);
      setRegisterGap(null);
      toast.success(`${t("checkOpened")} #${result.checkId}`);
      await utils.pos.read.orderSettlement.listByOrder.invalidate();
    } catch (error) {
      toast.error(userFacingError(error, t("errorTitle")));
    }
  }

  async function completePayment() {
    if (!terminalId || selectedOrderId == null || !paymentMethod) return;
    try {
      const result = await settleMutation.mutateAsync({
        restaurantId,
        terminalId,
        orderId: selectedOrderId,
        idempotencyKey: newCashierIdempotencyKey("settle"),
        paymentMethod,
      });
      setPaidCheckout({
        checkId: result.checkId,
        orderId: result.orderId,
        grandTotal: result.grandTotal,
        settlementRecordId: result.settlementRecordId,
        paymentMethod,
      });
      setRegisterGap(null);
      toast.success(
        `${t("paidTitle")} · ${t("checkLabel")} #${result.checkId} · ${result.grandTotal}`
      );
      invalidateOrderReads();
    } catch (error) {
      const gap = classifyCashierRegisterGap(error);
      if (gap) {
        setRegisterGap(gap);
      }
      toast.error(userFacingError(error, t("errorTitle")));
    }
  }

  function returnToDashboard() {
    syncDashboardUrl({ restaurantId, section: "home" });
  }

  function openNewTab() {
    if (!tryOpenCashierNewTab(restaurantId)) {
      toast.error(t("newTabBlocked"));
    }
  }

  const items = catalogQuery.data ?? [];
  const categories = useMemo(() => {
    const map = new Map<
      number,
      { id: number; nameAr: string | null; nameEn: string | null }
    >();
    for (const item of items) {
      if (!map.has(item.categoryId)) {
        map.set(item.categoryId, {
          id: item.categoryId,
          nameAr: item.categoryNameAr,
          nameEn: item.categoryNameEn,
        });
      }
    }
    return Array.from(map.values());
  }, [items]);
  const visibleItems =
    categoryFilter === "all"
      ? items
      : items.filter((item) => item.categoryId === categoryFilter);
  const orders = ordersQuery.data?.items ?? [];
  const ticketTotal = displayTicketTotal(ticket);
  const paymentOptions = listMonetaryPaymentMethodOptions(language);
  const settlementRow = (settlementQuery.data ?? [])[0];
  const visibleCheckId =
    paidCheckout?.checkId ?? openCheck?.checkId ?? settlementRow?.checkId ?? null;
  const amountDue =
    paidCheckout?.grandTotal ??
    settlementRow?.outstandingAmount ??
    detailQuery.data?.order.totalAmount ??
    null;
  const amountDueIsOrderFallback =
    !paidCheckout &&
    !settlementRow?.outstandingAmount &&
    Boolean(detailQuery.data?.order.totalAmount);

  const listDenied = Boolean(
    terminalsQuery.error && isForbidden(terminalsQuery.error)
  );
  const readsDenied =
    (accessQuery.data != null && accessQuery.data.allowed !== true) ||
    (accessQuery.error != null && isForbidden(accessQuery.error)) ||
    (catalogQuery.error != null && isForbidden(catalogQuery.error)) ||
    (ordersQuery.error != null && isForbidden(ordersQuery.error));
  const showCreateOrActivateTerminal =
    !terminalsQuery.isPending &&
    !listDenied &&
    activeTerminals.length === 0;
  const operationalStatus = saleMutation.isPending
    ? t("placing")
    : settleMutation.isPending
      ? t("paying")
      : paidCheckout
        ? t("paidTitle")
        : registerGap
          ? t("statusShift")
          : openCheck
            ? t("checkOpenedResult")
            : allowed
              ? t("statusReady")
              : t("loading");
  const selectedTerminalCode =
    activeTerminals.find((row) => row.id === terminalId)?.code ?? terminalId;

  return (
    <section dir={dir} className={cashierPos.root} aria-label={t("title")}>
      <header className={cashierPos.header}>
        <div className="min-w-0">
          <h1 className={cashierPos.headerTitle}>{t("title")}</h1>
          {restaurantName ? (
            <p className={cashierPos.headerMeta}>{restaurantName}</p>
          ) : null}
        </div>
        <span className={cashierPos.status}>{operationalStatus}</span>
        <label className="flex min-h-11 items-center gap-2 text-sm text-[#374151]">
          <span>{t("terminal")}</span>
          <select
            className={cashierPos.select}
            value={terminalId ?? ""}
            onChange={(event) => {
              const next = event.target.value || null;
              setTerminalId(next);
              writeCashierTerminalId(restaurantId, next);
            }}
            aria-label={t("selectTerminal")}
          >
            <option value="">{t("selectTerminal")}</option>
            {isCashierTerminalId(terminalId) &&
            !activeTerminals.some((row) => row.id === terminalId) ? (
              <option value={terminalId}>{selectedTerminalCode}</option>
            ) : null}
            {activeTerminals.map((row) => (
              <option key={row.id} value={row.id}>
                {row.code}
              </option>
            ))}
          </select>
        </label>
        <div className="ms-auto flex flex-wrap gap-2">
          <button type="button" className={cashierPos.headerBtn} onClick={openNewTab}>
            {t("openNewTab")}
          </button>
          <button
            type="button"
            className={cashierPos.headerBtnPrimary}
            onClick={returnToDashboard}
          >
            {t("returnDashboard")}
          </button>
        </div>
      </header>

      {terminalsQuery.isPending ? <AppLoadingState label={t("loading")} /> : null}

      {listDenied && !scoped ? (
        <div className="p-4">
          <AppForbiddenState
            title={t("accessDenied")}
            description={t("terminalListDenied")}
          />
        </div>
      ) : null}

      {showCreateOrActivateTerminal ? (
        <div className="p-4">
          <AppEmptyState
            title={t("noTerminal")}
            description={t("enableAccessHint")}
            action={
              <Button
                type="button"
                className="min-h-12"
                onClick={() => void ensureTerminal()}
                disabled={registerMutation.isPending || activateMutation.isPending}
              >
                {activatableTerminals.length > 0
                  ? t("activateTerminal")
                  : t("createTerminal")}
              </Button>
            }
          />
        </div>
      ) : null}

      {scoped && accessQuery.isPending ? (
        <AppLoadingState label={t("loading")} />
      ) : null}

      {scoped && !accessQuery.isPending && readsDenied ? (
        <div className="p-4">
          <AppForbiddenState
            title={t("accessDenied")}
            description={t("enableAccessHint")}
            action={
              user?.id ? (
                <Button
                  type="button"
                  className="min-h-12"
                  onClick={() => void enableCashierAccess()}
                  disabled={grantMutation.isPending}
                >
                  {t("enableAccess")}
                </Button>
              ) : null
            }
          />
        </div>
      ) : null}

      {scoped && allowed && catalogQuery.isError && !isForbidden(catalogQuery.error) ? (
        <div className="p-4">
          <AppErrorState
            title={t("errorTitle")}
            description={userFacingError(catalogQuery.error, t("errorTitle"))}
            retryLabel={t("retry")}
            onRetry={() => void catalogQuery.refetch()}
          />
        </div>
      ) : null}

      {scoped && allowed && ordersQuery.isError && !isForbidden(ordersQuery.error) ? (
        <div className="p-4">
          <AppErrorState
            title={t("errorTitle")}
            description={userFacingError(ordersQuery.error, t("errorTitle"))}
            retryLabel={t("retry")}
            onRetry={() => void ordersQuery.refetch()}
          />
        </div>
      ) : null}

      {scoped && allowed ? (
        <div className={cashierPos.body}>
          <div className={cashierPos.catalog}>
            <div className={cashierPos.categoryBar}>
              <button
                type="button"
                className={
                  categoryFilter === "all"
                    ? cashierPos.categoryBtnActive
                    : cashierPos.categoryBtn
                }
                onClick={() => setCategoryFilter("all")}
              >
                {t("allCategories")}
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={
                    categoryFilter === category.id
                      ? cashierPos.categoryBtnActive
                      : cashierPos.categoryBtn
                  }
                  onClick={() => setCategoryFilter(category.id)}
                >
                  {categoryLabel(
                    language,
                    category.nameAr,
                    category.nameEn,
                    t("unknownCategory")
                  )}
                </button>
              ))}
            </div>
            <div className={cashierPos.catalogScroll}>
              {catalogQuery.isPending ? (
                <AppLoadingState label={t("loading")} />
              ) : visibleItems.length === 0 ? (
                <AppEmptyState title={t("emptyCatalog")} />
              ) : (
                <div className={cashierPos.productGrid}>
                  {visibleItems.map((item) => {
                    const imageSrc = resolveImageUrl(item.imageUrl);
                    const itemName =
                      language === "ar" ? item.nameAr : item.nameEn ?? item.nameAr;
                    return (
                      <button
                        key={item.menuItemId}
                        type="button"
                        className={cashierPos.productCard}
                        onClick={() =>
                          addItem({
                            menuItemId: item.menuItemId,
                            nameAr: item.nameAr,
                            nameEn: item.nameEn,
                            price: item.price,
                          })
                        }
                      >
                        {imageSrc ? (
                          <img src={imageSrc} alt="" className={cashierPos.productImage} />
                        ) : (
                          <span aria-hidden className={cashierPos.productFallback}>
                            {itemName.slice(0, 1)}
                          </span>
                        )}
                        <span className={cashierPos.productName}>{itemName}</span>
                        <span className={cashierPos.productPrice}>{item.price}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className={cashierPos.aside}>
            <div className={cashierPos.ticket}>
              <h2 className="mb-2 text-sm font-semibold text-[#111827]">{t("ticket")}</h2>
              {ticket.length === 0 ? (
                <p className="text-sm text-[#6b7280]">{t("ticketEmpty")}</p>
              ) : (
                <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                  {ticket.map((line) => (
                    <li key={line.menuItemId} className={cashierPos.ticketLine}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#111827]">
                          {language === "ar" ? line.nameAr : line.nameEn ?? line.nameAr}
                        </p>
                        <p className="text-xs text-[#6b7280]">
                          {line.price} × {line.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-11"
                          aria-label={
                            line.quantity === 1 ? t("removeLine") : t("qty")
                          }
                          onClick={() => changeQty(line.menuItemId, -1)}
                        >
                          {line.quantity === 1 ? <Trash2 /> : <Minus />}
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold text-[#111827]">
                          {line.quantity}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-11"
                          aria-label={t("qty")}
                          onClick={() => changeQty(line.menuItemId, 1)}
                        >
                          <Plus />
                        </Button>
                      </div>
                      <p className="w-16 text-end text-sm font-semibold tabular-nums text-[#111827]">
                        {displayMoneyTimesQuantity(line.price, line.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className={cashierPos.totalBox}>
                <p className="flex justify-between text-sm text-[#6b7280]">
                  <span>{t("ticketSubtotal")}</span>
                  <span className="tabular-nums">{ticketTotal ?? "0.00"}</span>
                </p>
                <p className="mt-2 flex items-end justify-between">
                  <span className="text-sm font-semibold text-[#111827]">
                    {amountDue ? t("amountDue") : t("ticketTotal")}
                  </span>
                  <span className={cashierPos.totalValue}>
                    {amountDue ?? ticketTotal ?? "0.00"}
                  </span>
                </p>
                {amountDueIsOrderFallback ? (
                  <p className="mt-1 text-xs text-[#6b7280]">{t("orderTotalHint")}</p>
                ) : null}
              </div>
              <Button
                type="button"
                className={cn(cashierPos.primaryAction, "mt-3")}
                disabled={ticket.length === 0 || saleMutation.isPending || !terminalId}
                onClick={() => void placeSale()}
              >
                <ShoppingCart />
                {saleMutation.isPending ? t("placing") : t("placeSale")}
              </Button>
            </div>

            <div className={cashierPos.checkout}>
              <h2 className="mb-2 text-sm font-semibold text-[#111827]">{t("checkout")}</h2>
              {ordersQuery.isPending ? (
                <AppLoadingState label={t("loading")} />
              ) : (
                <>
                  <p className="mb-2 text-xs font-medium text-[#6b7280]">{t("activeOrders")}</p>
                  {orders.length === 0 ? (
                    <p className="mb-3 text-sm text-[#6b7280]">{t("noOrders")}</p>
                  ) : (
                    <ul className="mb-3 flex flex-col gap-2">
                      {orders.map((order) => (
                        <li key={order.orderId}>
                          <button
                            type="button"
                            className={
                              selectedOrderId === order.orderId
                                ? cashierPos.orderBtnActive
                                : cashierPos.orderBtn
                            }
                            onClick={() => selectOrder(order.orderId)}
                          >
                            <span className="block font-medium text-[#111827]">
                              {order.displayReference || order.orderNumber}
                            </span>
                            <span className="text-xs text-[#6b7280]">
                              {order.status} · {order.totalAmount}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {selectedOrderId == null ? (
                <p className="text-sm text-[#6b7280]">{t("noOrders")}</p>
              ) : detailQuery.isPending ? (
                <AppLoadingState label={t("loading")} />
              ) : detailQuery.data ? (
                <>
                  <p className="text-sm text-[#111827]">
                    {t("orderCreated")}: {detailQuery.data.order.displayReference} ·{" "}
                    {detailQuery.data.order.status}
                  </p>
                  {detailQuery.data.order.notes ? (
                    <p className="text-sm text-[#4b5563]">
                      {t("notes")}: {detailQuery.data.order.notes}
                    </p>
                  ) : null}
                  <ul className="my-2 text-sm text-[#374151]">
                    {detailQuery.data.order.lineItems.map((line) => (
                      <li key={line.lineItemId}>
                        {language === "ar" ? line.nameAr : line.nameEn ?? line.nameAr} ×{" "}
                        {line.quantity}
                        {line.itemNotes ? ` — ${t("notes")}: ${line.itemNotes}` : ""}
                        {line.modifiers.length > 0
                          ? ` — ${t("modifiers")}: ${line.modifiers.join(", ")}`
                          : ""}
                      </li>
                    ))}
                  </ul>

                  <div className={cashierPos.checkBox}>
                    {visibleCheckId != null ? (
                      <p className="text-sm text-[#111827]">
                        {t("checkLabel")} #{visibleCheckId}
                        {paidCheckout
                          ? ` · ${t("paidTitle")}`
                          : openCheck
                            ? ` · ${t("checkOpenedResult")}`
                            : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-[#6b7280]">{t("checkMissing")}</p>
                    )}
                    {amountDue ? (
                      <p className="mt-2 text-lg font-semibold tabular-nums text-[#0b3d36]">
                        {t("amountDue")}: {amountDue}
                      </p>
                    ) : null}
                  </div>

                  {paidCheckout ? (
                    <div className={cn(cashierPos.paidBox, "mt-3")}>
                      <p className="font-semibold">{t("paidTitle")}</p>
                      <p className="mt-1 text-sm">
                        {t("checkLabel")} #{paidCheckout.checkId} · {t("paymentMethod")}:{" "}
                        {paymentOptions.find(
                          (option) => option.paymentMethod === paidCheckout.paymentMethod
                        )?.label ?? paidCheckout.paymentMethod}{" "}
                        · {paidCheckout.grandTotal}
                      </p>
                      <p className="mt-2 text-xs">{t("paidBody")}</p>
                      <p className="mt-1 text-xs opacity-80">{t("afterPayment")}</p>
                      <Button
                        type="button"
                        className={cn(cashierPos.primaryAction, "mt-3")}
                        onClick={startNewSale}
                      >
                        {t("newSale")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="mb-2 mt-3 text-sm font-medium text-[#111827]">
                        {t("selectPaymentMethod")}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {paymentOptions.map((option) => (
                          <Button
                            key={option.paymentMethod}
                            type="button"
                            variant={
                              paymentMethod === option.paymentMethod ? "default" : "outline"
                            }
                            className="min-h-12"
                            disabled={visibleCheckId == null}
                            onClick={() => setPaymentMethod(option.paymentMethod)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      {registerGap ? (
                        <div className={cn(cashierPos.warnBox, "mt-3")}>
                          <p className="text-sm">
                            {t(
                              registerGap === "shift_required"
                                ? "shiftRequired"
                                : registerGap === "register_closed"
                                  ? "registerClosed"
                                  : "registerRequired"
                            )}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-3 min-h-12"
                            onClick={() =>
                              syncDashboardUrl({
                                restaurantId,
                                section: "register",
                              })
                            }
                          >
                            {t("openRegisterOps")}
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-[#6b7280]">{t("settlementGap")}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-12"
                          disabled={intakeMutation.isPending}
                          onClick={() => void intakeCheck()}
                        >
                          {t("intakeCheck")}
                        </Button>
                        <Button
                          type="button"
                          className="min-h-12"
                          disabled={
                            settleMutation.isPending ||
                            visibleCheckId == null ||
                            paymentMethod == null
                          }
                          onClick={() => void completePayment()}
                        >
                          {settleMutation.isPending ? t("paying") : t("completePayment")}
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="mt-3">
                    <h3 className="mb-1 text-xs font-semibold text-[#6b7280]">{t("timeline")}</h3>
                    <ul className="text-xs text-[#6b7280]">
                      {(timelineQuery.data?.events ?? []).map((event) => (
                        <li key={event.eventId}>
                          {event.toStatus} · {event.occurredAt}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {(settlementQuery.data ?? []).length > 0 ? (
                    <div className="mt-2">
                      <h3 className="mb-1 text-xs font-semibold text-[#6b7280]">
                        {t("settlement")}
                      </h3>
                      <ul className="text-sm text-[#374151]">
                        {(settlementQuery.data ?? []).map((row) => (
                          <li key={`${row.checkId}-${row.orderId}`}>
                            {row.settlementStatus} · {row.outstandingAmount}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <AppEmptyState title={t("noOrders")} />
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
