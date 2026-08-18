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
import { SettlementReceiptDialog } from "@/components/settlement-record/SettlementReceiptDialog";
import { Button } from "@/components/ui/button";
import {
  canConfirmCashierSettlement,
  displayCents,
  resolveCashierSettlementPlan,
} from "@/lib/cashier-workspace/cashierSplitTender";
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
  clearCashierDirectSale,
  readCashierDirectSale,
  writeCashierDirectSale,
} from "@/lib/cashier-workspace/cashierDirectSaleStorage";
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
import { useEffect, useMemo, useRef, useState } from "react";
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
  settlements: readonly { paymentMethod: SelectablePaymentMethod; amount?: string }[];
};

type DirectSale = {
  orderId: number;
  orderNumber: string;
  displayReference: string;
  totalAmount: string;
};

type DirectSalePhase = "ticket" | "payment" | "paid";

type Props = {
  restaurantId: number;
  language: CashierLang;
  restaurantName?: string | null;
  currencySymbol?: string | null;
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
  currencySymbol,
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
  const [directSale, setDirectSale] = useState<DirectSale | null>(null);
  const [salePhase, setSalePhase] = useState<DirectSalePhase>("ticket");
  const [cashReceived, setCashReceived] = useState("");
  const [cardTender, setCardTender] = useState("");
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const saleInFlightRef = useRef(false);
  const payInFlightRef = useRef(false);
  const saleKeyRef = useRef<string | null>(null);
  const settleKeyRef = useRef<string | null>(null);
  const intakeByOrderRef = useRef(new Map<number, Promise<OpenCheckResult | null>>());

  useEffect(() => {
    setTerminalId(readCashierTerminalId(restaurantId));
    setTicket([]);
    setSelectedOrderId(null);
    setCategoryFilter("all");
    setOpenCheck(null);
    setPaidCheckout(null);
    setPaymentMethod(null);
    setRegisterGap(null);
    setCashReceived("");
    setCardTender("");
    setOrdersOpen(false);
    setPrintOpen(false);
    const snapshot = readCashierDirectSale(restaurantId);
    if (snapshot) {
      setDirectSale({
        orderId: snapshot.orderId,
        orderNumber: snapshot.orderNumber,
        displayReference: snapshot.displayReference,
        totalAmount: snapshot.totalAmount,
      });
      setSelectedOrderId(snapshot.orderId);
      setSalePhase(snapshot.phase);
      setPaymentMethod(snapshot.paymentMethod);
      setCashReceived(snapshot.cashReceived);
      setCardTender(snapshot.cardTender ?? "");
      setOpenCheck(
        snapshot.checkId != null
          ? {
              checkId: snapshot.checkId,
              orderId: snapshot.orderId,
              outcome: "open",
              replayed: true,
            }
          : null
      );
      setPaidCheckout(
        snapshot.paid
          ? {
              ...snapshot.paid,
              settlements:
                snapshot.paid.settlements ??
                [{ paymentMethod: snapshot.paid.paymentMethod }],
            }
          : null
      );
    } else {
      setDirectSale(null);
      setSalePhase("ticket");
    }
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
    { enabled: scoped && allowed && ordersOpen, staleTime: 0 }
  );
  const detailQuery = trpc.pos.read.orders.getDetail.useQuery(
    {
      restaurantId,
      terminalId: terminalId ?? "",
      orderId: selectedOrderId ?? 0,
    },
    { enabled: scoped && allowed && ordersOpen && selectedOrderId != null }
  );
  const timelineQuery = trpc.pos.read.orders.getTimeline.useQuery(
    {
      restaurantId,
      terminalId: terminalId ?? "",
      orderId: selectedOrderId ?? 0,
    },
    { enabled: scoped && allowed && ordersOpen && selectedOrderId != null }
  );
  const settlementQuery = trpc.pos.read.orderSettlement.listByOrder.useQuery(
    {
      restaurantId,
      terminalId: terminalId ?? "",
      orderId: selectedOrderId ?? 0,
    },
    {
      enabled:
        scoped &&
        allowed &&
        selectedOrderId != null &&
        (salePhase !== "ticket" || ordersOpen),
    }
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
    if (directSale?.orderId === orderId && !paidCheckout) {
      setSelectedOrderId(orderId);
      setSalePhase("payment");
      persistDirectSaleSnapshot({ phase: "payment" });
      return;
    }
    setSelectedOrderId(orderId);
    setOpenCheck(null);
    setPaidCheckout(null);
    setPaymentMethod(null);
    setRegisterGap(null);
  }

  function persistDirectSaleSnapshot(next?: {
    phase?: DirectSalePhase;
    sale?: DirectSale | null;
    checkId?: number | null;
    paid?: PaidCheckoutResult | null;
    method?: SelectablePaymentMethod | null;
    received?: string;
    card?: string;
  }) {
    const sale = next?.sale === undefined ? directSale : next.sale;
    const phase = next?.phase ?? salePhase;
    if (!sale || phase === "ticket") {
      clearCashierDirectSale(restaurantId);
      return;
    }
    writeCashierDirectSale(restaurantId, {
      v: 1,
      orderId: sale.orderId,
      orderNumber: sale.orderNumber,
      displayReference: sale.displayReference,
      totalAmount: sale.totalAmount,
      checkId:
        next?.checkId === undefined
          ? (paidCheckout?.checkId ?? openCheck?.checkId ?? null)
          : next.checkId,
      phase,
      paymentMethod: next?.method === undefined ? paymentMethod : next.method,
      cashReceived: next?.received ?? cashReceived,
      cardTender: next?.card ?? cardTender,
      paid: next?.paid === undefined ? paidCheckout : next.paid,
    });
  }

  function startNewSale() {
    saleInFlightRef.current = false;
    payInFlightRef.current = false;
    setPaymentBusy(false);
    saleKeyRef.current = null;
    settleKeyRef.current = null;
    intakeByOrderRef.current.clear();
    setTicket([]);
    setSelectedOrderId(null);
    setOpenCheck(null);
    setPaidCheckout(null);
    setPaymentMethod(null);
    setRegisterGap(null);
    setDirectSale(null);
    setSalePhase("ticket");
    setCashReceived("");
    setCardTender("");
    setPrintOpen(false);
    clearCashierDirectSale(restaurantId);
  }

  function cancelPaymentSheet() {
    if (payInFlightRef.current || settleMutation.isPending || paymentBusy) return;
    // Presentation-only: close the payment sheet. Do not cancel the Order,
    // void the Check, void a Settlement, or issue a refund.
    setSalePhase("ticket");
    setPrintOpen(false);
    clearCashierDirectSale(restaurantId);
  }

  function resumePaymentSheet() {
    if (!directSale || paidCheckout) return;
    setSalePhase("payment");
    persistDirectSaleSnapshot({ phase: "payment" });
  }

  async function placeSale() {
    // Confirm Order → pos.sale.create. Does not pay Check or Settlement.
    if (!terminalId || ticket.length === 0) return;
    if (saleInFlightRef.current || saleMutation.isPending) return;
    saleInFlightRef.current = true;
    if (!saleKeyRef.current) {
      saleKeyRef.current = newCashierIdempotencyKey("sale");
    }
    try {
      const result = await saleMutation.mutateAsync({
        restaurantId,
        terminalId,
        items: ticket.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
        })),
        idempotencyKey: saleKeyRef.current,
      });
      saleKeyRef.current = null;
      const sale: DirectSale = {
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        displayReference: result.displayReference,
        totalAmount: result.totalAmount,
      };
      settleKeyRef.current = newCashierIdempotencyKey("settle");
      setTicket([]);
      setSelectedOrderId(result.orderId);
      setOpenCheck(null);
      setPaidCheckout(null);
      setPaymentMethod(null);
      setRegisterGap(null);
      setDirectSale(sale);
      setSalePhase("payment");
      setCashReceived(result.totalAmount);
      setCardTender("");
      persistDirectSaleSnapshot({
        sale,
        phase: "payment",
        checkId: null,
        paid: null,
        method: null,
        received: result.totalAmount,
        card: "",
      });
      toast.success(`${t("salePlaced")} ${result.displayReference}`);
      void orchestrateIntake(result.orderId);
    } catch (error) {
      toast.error(userFacingError(error, t("errorTitle")));
    } finally {
      saleInFlightRef.current = false;
    }
  }

  function orchestrateIntake(orderId: number): Promise<OpenCheckResult | null> {
    const existing = intakeByOrderRef.current.get(orderId);
    if (existing) return existing;
    const pending = (async (): Promise<OpenCheckResult | null> => {
      if (!terminalId) return null;
      try {
        const result = await intakeMutation.mutateAsync({
          restaurantId,
          terminalId,
          orderId,
          idempotencyKey: newCashierIdempotencyKey("check"),
        });
        const opened: OpenCheckResult = {
          checkId: result.checkId,
          orderId: result.orderId,
          outcome: result.outcome,
          replayed: result.replayed,
        };
        setOpenCheck(opened);
        const current = readCashierDirectSale(restaurantId);
        if (current) {
          writeCashierDirectSale(restaurantId, {
            ...current,
            checkId: result.checkId,
          });
        }
        void utils.pos.read.orderSettlement.listByOrder.invalidate();
        return opened;
      } catch (error) {
        intakeByOrderRef.current.delete(orderId);
        toast.error(userFacingError(error, t("errorTitle")));
        return null;
      }
    })();
    intakeByOrderRef.current.set(orderId, pending);
    return pending;
  }

  async function completePayment() {
    if (!terminalId || selectedOrderId == null) return;
    if (payInFlightRef.current || settleMutation.isPending) return;
    const due = amountDue;
    if (!due) return;
    const plan = resolveCashierSettlementPlan({
      amountDue: due,
      cashTender: cashReceived,
      cardTender,
    });
    if (!plan || !canConfirmCashierSettlement({
      amountDue: due,
      cashTender: cashReceived,
      cardTender,
    })) {
      return;
    }
    payInFlightRef.current = true;
    setPaymentBusy(true);
    if (!settleKeyRef.current) {
      settleKeyRef.current = newCashierIdempotencyKey("settle");
    }
    try {
      if (!openCheck) {
        void orchestrateIntake(selectedOrderId);
      }
      const result = await settleMutation.mutateAsync({
        restaurantId,
        terminalId,
        orderId: selectedOrderId,
        idempotencyKey: settleKeyRef.current,
        paymentMethod: plan.paymentMethod,
        settlements: [...plan.settlements],
      });
      const paid: PaidCheckoutResult = {
        checkId: result.checkId,
        orderId: result.orderId,
        grandTotal: result.grandTotal,
        settlementRecordId: result.settlementRecordId,
        paymentMethod: plan.paymentMethod,
        settlements: plan.settlements,
      };
      setPaidCheckout(paid);
      setRegisterGap(null);
      setSalePhase("paid");
      persistDirectSaleSnapshot({
        phase: "paid",
        checkId: result.checkId,
        paid,
      });
      toast.success(
        `${t("paidSuccess")} · ${t("checkLabel")} #${result.checkId} · ${result.grandTotal}`
      );
      invalidateOrderReads();
      if (result.settlementRecordId) {
        setPrintOpen(true);
      }
    } catch (error) {
      const gap = classifyCashierRegisterGap(error);
      if (gap) {
        setRegisterGap(gap);
      }
      toast.error(userFacingError(error, t("errorTitle")));
    } finally {
      payInFlightRef.current = false;
      setPaymentBusy(false);
    }
  }

  function returnToDashboard() {
    syncDashboardUrl({ restaurantId, section: "home" });
  }

  function openRegisterOps() {
    persistDirectSaleSnapshot();
    syncDashboardUrl({
      restaurantId,
      section: "register",
    });
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
  const checkAmountDue =
    paidCheckout?.grandTotal ?? settlementRow?.outstandingAmount ?? null;
  const amountDue = checkAmountDue;
  const amountDueIsOrderFallback =
    !paidCheckout &&
    !settlementRow?.outstandingAmount &&
    Boolean(directSale?.totalAmount);

  useEffect(() => {
    if (salePhase !== "payment" || paidCheckout) return;
    const checkDue = settlementRow?.outstandingAmount;
    if (!checkDue) return;
    setCashReceived((current) => {
      if (current === "" || current === directSale?.totalAmount) {
        return checkDue;
      }
      return current;
    });
  }, [
    salePhase,
    paidCheckout,
    settlementRow?.outstandingAmount,
    directSale?.totalAmount,
  ]);
  const money = (value: string) =>
    currencySymbol ? `${value} ${currencySymbol}` : value;
  const tenderDraft =
    amountDue != null
      ? {
          amountDue,
          cashTender: cashReceived,
          cardTender,
        }
      : null;
  const tenderPlan = tenderDraft
    ? resolveCashierSettlementPlan(tenderDraft)
    : null;
  const canConfirmPayment =
    tenderDraft != null && canConfirmCashierSettlement(tenderDraft);
  const cashChange =
    tenderPlan && tenderPlan.changeCents > 0
      ? displayCents(tenderPlan.changeCents)
      : null;

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
  const paying = settleMutation.isPending || paymentBusy;
  const operationalStatus = saleMutation.isPending
    ? t("placing")
    : paying
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
      <div className="flex min-h-0 flex-1 flex-col print:hidden">
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
                  <span className="tabular-nums">{money(ticketTotal ?? "0.00")}</span>
                </p>
                <p className="mt-2 flex items-end justify-between">
                  <span className="text-sm font-semibold text-[#111827]">
                    {t("ticketTotal")}
                  </span>
                  <span className={cashierPos.totalValue}>
                    {money(ticketTotal ?? "0.00")}
                  </span>
                </p>
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
              {directSale && salePhase === "ticket" && !paidCheckout ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 min-h-12 w-full"
                  onClick={resumePaymentSheet}
                >
                  {t("completePayment")} · {directSale.displayReference}
                </Button>
              ) : null}
            </div>

            <div className={cashierPos.checkout}>
              <button
                type="button"
                className={cashierPos.headerBtn}
                onClick={() => setOrdersOpen((open) => !open)}
              >
                {ordersOpen ? t("hideActiveOrders") : t("showActiveOrders")}
              </button>
              {ordersOpen ? (
                <div className="mt-3">
                  {ordersQuery.isPending ? (
                    <AppLoadingState label={t("loading")} />
                  ) : orders.length === 0 ? (
                    <p className="text-sm text-[#6b7280]">{t("noOrders")}</p>
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
                  {selectedOrderId != null && detailQuery.data ? (
                    <>
                      <p className="text-sm text-[#111827]">
                        {t("orderCreated")}: {detailQuery.data.order.displayReference} ·{" "}
                        {detailQuery.data.order.status}
                      </p>
                      <div className="mt-3">
                        <h3 className="mb-1 text-xs font-semibold text-[#6b7280]">
                          {t("timeline")}
                        </h3>
                        <ul className="text-xs text-[#6b7280]">
                          {(timelineQuery.data?.events ?? []).map((event) => (
                            <li key={event.eventId}>
                              {event.toStatus} · {event.occurredAt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {salePhase !== "ticket" && directSale ? (
        <div className={cashierPos.overlay} role="dialog" aria-modal="true">
          <div className={cashierPos.sheet} dir={dir}>
            {salePhase === "paid" && paidCheckout ? (
              <>
                <h2 className="text-lg font-semibold">{t("paidSuccess")}</h2>
                <p className="mt-3 text-sm text-[#6b7280]">{t("orderNumber")}</p>
                <p className="text-base font-semibold">{directSale.displayReference}</p>
                <p className="mt-2 text-sm text-[#6b7280]">{t("invoiceNumber")}</p>
                <p className="text-base font-semibold">
                  {t("checkLabel")} #{paidCheckout.checkId}
                </p>
                <p className="mt-2 text-sm text-[#6b7280]">{t("paymentMethod")}</p>
                <ul className="mt-1 space-y-1">
                  {(paidCheckout.settlements.length > 0
                    ? paidCheckout.settlements
                    : [{ paymentMethod: paidCheckout.paymentMethod }]
                  ).map((line) => (
                    <li
                      key={`${line.paymentMethod}-${line.amount ?? "full"}`}
                      className="flex justify-between text-base font-semibold"
                    >
                      <span>
                        {paymentOptions.find(
                          (option) => option.paymentMethod === line.paymentMethod
                        )?.label ?? line.paymentMethod}
                      </span>
                      {line.amount ? (
                        <span className="tabular-nums">{money(line.amount)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-[#6b7280]">{t("amountDue")}</p>
                <p className={cashierPos.amountDueHuge}>{money(paidCheckout.grandTotal)}</p>
                <p className="mt-2 text-xs text-[#6b7280]">{t("afterPayment")}</p>
                <Button
                  type="button"
                  className={cn(cashierPos.primaryAction, "mt-4")}
                  disabled={!paidCheckout.settlementRecordId}
                  onClick={() => setPrintOpen(true)}
                >
                  {t("printInvoice")}
                </Button>
                {!paidCheckout.settlementRecordId ? (
                  <p className="mt-2 text-xs text-[#6b7280]">{t("printUnavailable")}</p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 min-h-12 w-full"
                  onClick={startNewSale}
                >
                  {t("newSale")}
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">{t("completePaymentTitle")}</h2>
                <p className="mt-1 text-sm text-[#6b7280]">{directSale.displayReference}</p>
                <p className="mt-1 text-sm text-[#6b7280]">{t("unpaidOrderHint")}</p>
                <p className="mt-4 text-sm font-medium text-[#6b7280]">
                  {amountDue ? t("checkAmountDue") : t("amountDue")}
                </p>
                <p className={cashierPos.amountDueHuge}>
                  {amountDue ? money(amountDue) : t("preparingCheck")}
                </p>
                {settlementRow &&
                settlementRow.settledAmount &&
                settlementRow.settledAmount !== "0.00" ? (
                  <p className="mt-1 flex justify-between text-sm text-[#6b7280]">
                    <span>{t("checkSettledAmount")}</span>
                    <span className="tabular-nums">{money(settlementRow.settledAmount)}</span>
                  </p>
                ) : null}
                {amountDueIsOrderFallback ? (
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {t("orderTotalHint")} · {money(directSale.totalAmount)}
                  </p>
                ) : null}
                {intakeMutation.isPending ? (
                  <p className="mt-2 text-sm text-[#6b7280]">{t("preparingCheck")}</p>
                ) : null}
                <p className="mb-2 mt-4 text-sm font-medium">{t("selectPaymentMethod")}</p>
                <div className="space-y-3">
                  {paymentOptions.map((option) => {
                    const isCash = option.paymentMethod === "cash";
                    const value = isCash ? cashReceived : cardTender;
                    return (
                      <div key={option.paymentMethod}>
                        <label
                          className="text-sm font-medium"
                          htmlFor={`cashier-tender-${option.paymentMethod}`}
                        >
                          {option.label}
                        </label>
                        <input
                          id={`cashier-tender-${option.paymentMethod}`}
                          className={cn(cashierPos.moneyInput, "mt-1")}
                          inputMode="decimal"
                          disabled={paying}
                          value={value}
                          onChange={(event) => {
                            const next = event.target.value;
                            if (isCash) {
                              setCashReceived(next);
                              setPaymentMethod(next.trim() ? "cash" : cardTender.trim() ? "card" : null);
                              persistDirectSaleSnapshot({
                                received: next,
                                method: next.trim() ? "cash" : cardTender.trim() ? "card" : null,
                              });
                            } else {
                              setCardTender(next);
                              setPaymentMethod(next.trim() ? "card" : cashReceived.trim() ? "cash" : null);
                              persistDirectSaleSnapshot({
                                card: next,
                                method: next.trim() ? "card" : cashReceived.trim() ? "cash" : null,
                              });
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 flex justify-between text-sm">
                  <span>{t("totalTendered")}</span>
                  <span className="tabular-nums font-semibold">
                    {money(displayCents(tenderPlan?.totalEnteredCents ?? 0))}
                  </span>
                </p>
                <p className="mt-1 flex justify-between text-sm">
                  <span>{t("remainingAmount")}</span>
                  <span className="tabular-nums font-semibold">
                    {money(
                      tenderPlan
                        ? displayCents(tenderPlan.remainingCents)
                        : (amountDue ?? "0.00")
                    )}
                  </span>
                </p>
                {cashChange ? (
                  <p className="mt-1 flex justify-between text-sm">
                    <span>{t("changeDue")}</span>
                    <span className="tabular-nums font-semibold">{money(cashChange)}</span>
                  </p>
                ) : null}
                {tenderPlan && tenderPlan.remainingCents > 0 ? (
                  <p className="mt-1 text-sm text-red-700">{t("underpayment")}</p>
                ) : null}
                {tenderPlan &&
                tenderPlan.remainingCents === 0 &&
                !canConfirmPayment ? (
                  <p className="mt-1 text-sm text-red-700">{t("cardOverTender")}</p>
                ) : null}
                {registerGap ? (
                  <div className={cn(cashierPos.warnBox, "mt-4")}>
                    <p className="text-sm font-medium">{t("shiftBeforePay")}</p>
                    <p className="mt-1 text-sm">
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
                      onClick={openRegisterOps}
                    >
                      {t("openRegisterOps")}
                    </Button>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 min-w-28 flex-1"
                    disabled={paying}
                    onClick={cancelPaymentSheet}
                  >
                    {t("cancelPayment")}
                  </Button>
                  <Button
                    type="button"
                    className={cn(cashierPos.primaryAction, "flex-1")}
                    disabled={
                      paying ||
                      !canConfirmPayment ||
                      amountDue == null ||
                      amountDueIsOrderFallback
                    }
                    onClick={() => void completePayment()}
                  >
                    {paying ? t("paying") : t("confirmPayment")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
      </div>

      <SettlementReceiptDialog
        open={printOpen}
        restaurantId={restaurantId}
        settlementRecordId={paidCheckout?.settlementRecordId ?? null}
        language={language}
        restaurantName={restaurantName ?? undefined}
        onOpenChange={setPrintOpen}
      />
    </section>
  );
}
