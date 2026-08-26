/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1
 * Restaurant Dashboard cashier workspace. Presentation + existing POS tRPC only.
 * CASHIER-SALE-INVOICE-UX-REALIGNMENT-1 — left workspace is SALE/INVOICE.
 * CASHIER-PAYMENT-CANCEL-RETURN-TO-EDITABLE-1 — Cancel Payment restores
 * catalog editing on the same Order. P# / date / time stay off the left
 * panel until Confirm / Paid Receipt.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import {
  AppEmptyState,
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from "@/components/app-state";
import { CashierPaidReceiptDialog } from "@/components/cashier-workspace/CashierPaidReceiptDialog";
import { Button } from "@/components/ui/button";
import { cashierPaymentFlowTiming } from "@/lib/cashier-workspace/cashierPaymentFlowTiming";
import type { CashierPaymentFlowOutcome } from "@/lib/cashier-workspace/cashierPaymentFlowTiming";
import { resolveCashierPaymentReadiness } from "@/lib/cashier-workspace/cashierPaymentReadiness";
import {
  canConfirmCashierSettlement,
  displayCents,
  resolveCashierSettlementPlan,
} from "@/lib/cashier-workspace/cashierSplitTender";
import { newCashierIdempotencyKey, newCashierPaymentIntentId } from "@/lib/cashier-workspace/cashierIdempotency";
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
  buildCashierPaidReceiptSnapshot,
  type CashierPaidReceiptSnapshot,
} from "@/lib/cashier-workspace/cashierPaidReceipt";
import {
  isCashierTerminalId,
  readCashierTerminalId,
  writeCashierTerminalId,
} from "@/lib/cashier-workspace/cashierTerminalStorage";
import {
  clampCashierDiscountAmount,
  cashierDisplayTaxPolicy,
  displayCashierTicketMoney,
} from "@/lib/cashier-workspace/cashierTicketMoney";
import {
  buildDraftCashierInvoiceView,
  buildPreparedCashierInvoiceView,
  cashierCatalogTicketMatchesInvoiceLines,
  catalogTicketFromInvoiceLines,
  mapSaleCreateLinesToInvoiceLines,
  type CashierInvoiceLineView,
  type CashierSaleCreateMoney,
} from "@/lib/cashier-workspace/cashierInvoiceView";
import type { CashierTenderMode } from "@/lib/cashier-workspace/cashierTenderMode";
import {
  displayTicketTotal,
  isPositiveDisplayMoney,
} from "@/lib/cashier-workspace/cashierTicketTotals";
import {
  tryOpenCashierNewTab,
} from "@/lib/cashier-workspace/cashierWorkspaceNav";
import { CASHIER_V1_PERMISSIONS } from "@/lib/cashier-workspace/cashierWorkspacePermissions";
import { syncDashboardUrl } from "@/lib/dashboardUrl";
import { formatTrpcErrorForUser } from "@/lib/trpcErrors";
import { classifyQueryError } from "@/lib/ui-state/classifyQueryError";
import { trpc } from "@/lib/trpc";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { CheckMoneyResult } from "@shared/operational-session";
import type { SelectablePaymentMethod } from "@shared/operational-session";
import { projectCashierSaleInvoiceMoney } from "@shared/operational-session";
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
  createdAt: string;
  money: CashierSaleCreateMoney;
  lines: readonly CashierInvoiceLineView[];
};

type DirectSalePhase = "ticket" | "payment" | "paid";

type Props = {
  restaurantId: number;
  language: CashierLang;
  restaurantName?: string | null;
  currencySymbol?: string | null;
  taxEnabled?: boolean | null;
  taxMode?: string | null;
  taxPolicyJson?: string | null;
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
  taxEnabled,
  taxMode,
  taxPolicyJson,
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
  const [tenderMode, setTenderMode] = useState<CashierTenderMode | null>(null);
  const [ticketDiscount, setTicketDiscount] = useState("0.00");
  const [discountDraft, setDiscountDraft] = useState("");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [paymentDisplayMoney, setPaymentDisplayMoney] =
    useState<CheckMoneyResult | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [paidReceipt, setPaidReceipt] =
    useState<CashierPaidReceiptSnapshot | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const saleInFlightRef = useRef(false);
  const payInFlightRef = useRef(false);
  const saleKeyRef = useRef<string | null>(null);
  const settleKeyRef = useRef<string | null>(null);
  const paymentIntentRef = useRef<string | null>(null);
  const cashierFlowIdRef = useRef<string | null>(null);

  function endCashierPaymentFlow(outcome: CashierPaymentFlowOutcome) {
    const flowId = cashierFlowIdRef.current;
    if (!flowId) return;
    cashierPaymentFlowTiming.complete(flowId, outcome);
    cashierFlowIdRef.current = null;
  }

  useEffect(() => {
    endCashierPaymentFlow("abandoned");
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
    setTenderMode(null);
    setTicketDiscount("0.00");
    setDiscountDraft("");
    setDiscountOpen(false);
    setPaymentDisplayMoney(null);
    setOrdersOpen(false);
    setPrintOpen(false);
    setPaidReceipt(null);
    const snapshot = readCashierDirectSale(restaurantId);
    if (snapshot) {
      const canResumePayment = Number.isInteger(snapshot.orderId) && snapshot.orderId > 0;
      setDirectSale(
        canResumePayment
          ? {
              orderId: snapshot.orderId,
              orderNumber: snapshot.orderNumber,
              displayReference: snapshot.displayReference,
              totalAmount: snapshot.totalAmount,
              createdAt: snapshot.invoice?.createdAt ?? "",
              money: snapshot.invoice?.money ?? {
                subtotal: snapshot.totalAmount,
                taxAmount: "0.00",
                grandTotal: snapshot.totalAmount,
                billDiscountAmount: "0.00",
              },
              lines: snapshot.invoice?.lines ?? [],
            }
          : null
      );
      setSelectedOrderId(canResumePayment ? snapshot.orderId : null);
      setSalePhase(canResumePayment ? snapshot.phase : "ticket");
      setPaymentMethod(snapshot.paymentMethod);
      setCashReceived(snapshot.cashReceived);
      setCardTender(snapshot.cardTender ?? "");
      setOpenCheck(null);
      const restoredTicket = catalogTicketFromInvoiceLines(
        snapshot.invoice?.lines ?? []
      );
      if (restoredTicket.length > 0) setTicket(restoredTicket);
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

  useEffect(() => {
    return () => {
      const flowId = cashierFlowIdRef.current;
      if (!flowId) return;
      cashierPaymentFlowTiming.complete(flowId, "abandoned");
      cashierFlowIdRef.current = null;
    };
  }, []);

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
        ordersOpen &&
        selectedOrderId != null,
    }
  );
  const checkQuery = trpc.pos.read.check.getByOrder.useQuery(
    {
      restaurantId,
      terminalId: terminalId ?? "",
      orderId: selectedOrderId ?? 0,
    },
    {
      enabled:
        scoped &&
        allowed &&
        ordersOpen &&
        selectedOrderId != null,
    }
  );

  const grantMutation = trpc.pos.access.grant.useMutation();
  const registerMutation = trpc.pos.terminal.register.useMutation();
  const activateMutation = trpc.pos.terminal.activate.useMutation();
  const saleMutation = trpc.pos.sale.create.useMutation();
  const settleMutation = trpc.pos.settlement.initiate.useMutation();

  function invalidateOrderReads() {
    void utils.pos.read.orders.listActive.invalidate();
    void utils.pos.read.orders.getDetail.invalidate();
    void utils.pos.read.orders.getTimeline.invalidate();
    void utils.pos.read.orderSettlement.listByOrder.invalidate();
    void utils.pos.read.check.getByOrder.invalidate();
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
      if (salePhase === "payment" || paidCheckout) return current;
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
    if (salePhase === "payment" || paidCheckout) return;
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
    if (!sale) {
      clearCashierDirectSale(restaurantId);
      return;
    }
    writeCashierDirectSale(restaurantId, {
      v: 2,
      orderId: sale.orderId,
      orderNumber: sale.orderNumber,
      displayReference: sale.displayReference,
      totalAmount: sale.totalAmount,
      checkId:
        next?.checkId === undefined
          ? (paidCheckout?.checkId ?? null)
          : next.checkId,
      phase,
      paymentMethod: next?.method === undefined ? paymentMethod : next.method,
      cashReceived: next?.received ?? cashReceived,
      cardTender: next?.card ?? cardTender,
      invoice: {
        createdAt: sale.createdAt,
        money: sale.money,
        lines: sale.lines,
      },
      paid: next?.paid === undefined ? paidCheckout : next.paid,
    });
  }

  function startNewSale() {
    // Clear the current sale only. Paid receipt snapshot / print stay open.
    endCashierPaymentFlow("abandoned");
    saleInFlightRef.current = false;
    payInFlightRef.current = false;
    setPaymentBusy(false);
    saleKeyRef.current = null;
    settleKeyRef.current = null;
    paymentIntentRef.current = null;
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
    setTenderMode(null);
    setTicketDiscount("0.00");
    setDiscountDraft("");
    setDiscountOpen(false);
    setPaymentDisplayMoney(null);
    clearCashierDirectSale(restaurantId);
  }

  function cancelPaymentSheet() {
    if (
      payInFlightRef.current ||
      settleMutation.isPending ||
      paymentBusy ||
      saleInFlightRef.current ||
      saleMutation.isPending
    ) {
      return;
    }
    // Close Payment review. Keep the same Order identity and restore editing.
    endCashierPaymentFlow("cancelled");
    const restored = catalogTicketFromInvoiceLines(directSale?.lines ?? []);
    if (restored.length > 0) setTicket(restored);
    setSalePhase("ticket");
    persistDirectSaleSnapshot({ phase: "ticket" });
  }

  function resumePaymentSheet() {
    if (!directSale || paidCheckout) return;
    setSalePhase("payment");
    persistDirectSaleSnapshot({ phase: "payment" });
  }

  async function placeSale() {
    // Persist Order as the invoice first. Payment overlay is not money received.
    // OPEN Check is not created here.
    if (!terminalId || ticket.length === 0) return;
    if (saleInFlightRef.current || saleMutation.isPending) return;
    endCashierPaymentFlow("abandoned");
    cashierFlowIdRef.current = cashierPaymentFlowTiming.beginFlow({
      restaurantId,
      terminalId,
    });
    cashierPaymentFlowTiming.mark(
      cashierFlowIdRef.current,
      "CASHIER_ORDER_CONFIRM_CLICK"
    );
    saleInFlightRef.current = true;
    if (!saleKeyRef.current) {
      saleKeyRef.current = newCashierIdempotencyKey("sale");
    }
    setPaidCheckout(null);
    setRegisterGap(null);
    setPaymentMethod(null);
    setTenderMode(null);
    setCashReceived("");
    setCardTender("");
    const catalogSubtotal = displayTicketTotal(ticket);
    const discount = clampCashierDiscountAmount(ticketDiscount, catalogSubtotal);
    setTicketDiscount(discount);
    setPaymentDisplayMoney(
      displayCashierTicketMoney({
        catalogSubtotal,
        billDiscountAmount: discount,
        taxPolicySnapshot: cashierDisplayTaxPolicy({
          taxEnabled,
          taxMode,
          taxPolicyJson,
        }),
      })
    );
    cashierPaymentFlowTiming.mark(
      cashierFlowIdRef.current,
      "CASHIER_SALE_REQUEST_START"
    );
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
      if (!Number.isInteger(result.orderId) || result.orderId <= 0) {
        throw new Error("Sale was not recorded");
      }
      cashierPaymentFlowTiming.mark(
        cashierFlowIdRef.current,
        "CASHIER_SALE_RESPONSE"
      );
      cashierPaymentFlowTiming.attachOrderId(
        cashierFlowIdRef.current,
        result.orderId
      );
      const sale: DirectSale = {
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        displayReference: result.displayReference,
        totalAmount: result.totalAmount,
        createdAt: result.createdAt,
        money: result.money,
        lines: mapSaleCreateLinesToInvoiceLines(result.lines, ticket),
      };
      settleKeyRef.current = newCashierIdempotencyKey("settle");
      paymentIntentRef.current = newCashierPaymentIntentId();
      setSelectedOrderId(result.orderId);
      setOpenCheck(null);
      setDirectSale(sale);
      persistDirectSaleSnapshot({
        sale,
        phase: "payment",
        checkId: null,
        paid: null,
        method: null,
        received: "",
        card: "",
      });
      setSalePhase("payment");
      cashierPaymentFlowTiming.mark(
        cashierFlowIdRef.current,
        "CASHIER_PAYMENT_WORKFLOW_START"
      );
    } catch (error) {
      endCashierPaymentFlow("failed");
      setSalePhase("ticket");
      toast.error(userFacingError(error, t("errorTitle")));
    } finally {
      saleInFlightRef.current = false;
    }
  }

  async function completePayment() {
    if (!terminalId || selectedOrderId == null) return;
    if (payInFlightRef.current || settleMutation.isPending) return;
    if (tenderMode == null) return;
    const due = amountDue;
    if (!due) return;
    const cashTender = tenderMode === "network" ? "" : cashReceived;
    const cardTenderValue = tenderMode === "cash" ? "" : cardTender;
    const plan = resolveCashierSettlementPlan({
      amountDue: due,
      cashTender,
      cardTender: cardTenderValue,
    });
    if (!plan || !canConfirmCashierSettlement({
      amountDue: due,
      cashTender,
      cardTender: cardTenderValue,
    })) {
      return;
    }
    cashierPaymentFlowTiming.mark(
      cashierFlowIdRef.current,
      "CASHIER_PAYMENT_CONFIRM_CLICK"
    );
    payInFlightRef.current = true;
    setPaymentBusy(true);
    if (!settleKeyRef.current) {
      settleKeyRef.current = newCashierIdempotencyKey("settle");
    }
    if (!paymentIntentRef.current) {
      paymentIntentRef.current = newCashierPaymentIntentId();
    }
    try {
      cashierPaymentFlowTiming.mark(
        cashierFlowIdRef.current,
        "CASHIER_SETTLEMENT_REQUEST_START"
      );
      const result = await settleMutation.mutateAsync({
        restaurantId,
        terminalId,
        orderId: selectedOrderId,
        idempotencyKey: settleKeyRef.current,
        paymentIntentId: paymentIntentRef.current,
        paymentMethod: plan.paymentMethod,
        settlements: [...plan.settlements],
        ...(ticketDiscount && ticketDiscount !== "0.00"
          ? { billDiscountAmount: ticketDiscount }
          : {}),
      });
      cashierPaymentFlowTiming.mark(
        cashierFlowIdRef.current,
        "CASHIER_SETTLEMENT_RESPONSE"
      );
      cashierPaymentFlowTiming.attachCheckId(
        cashierFlowIdRef.current,
        result.checkId
      );
      const receipt = result.paidReceipt
        ? buildCashierPaidReceiptSnapshot({
            projection: result.paidReceipt,
            restaurantName,
          })
        : null;
      setRegisterGap(null);
      cashierPaymentFlowTiming.mark(
        cashierFlowIdRef.current,
        "CASHIER_PAYMENT_SUCCESS"
      );
      endCashierPaymentFlow("completed");
      toast.success(
        `${t("paidSuccess")} · ${directSale?.displayReference ?? ""} · ${result.grandTotal}`
      );
      invalidateOrderReads();
      startNewSale();
      if (receipt) {
        setPaidReceipt(receipt);
        setPrintOpen(true);
      }
    } catch (error) {
      const gap = classifyCashierRegisterGap(error);
      if (gap) {
        endCashierPaymentFlow("failed");
        setRegisterGap(gap);
        toast.error(userFacingError(error, t("errorTitle")));
        return;
      }
      // A lost transport response is retried by submitting this same command.
      // The stable idempotency key and payment intent make Collection Fact replay
      // the sole confirmation path; the client never reads Check or SR to infer PAID.
      endCashierPaymentFlow("failed");
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
  const taxPolicySnapshot = useMemo(
    () => cashierDisplayTaxPolicy({ taxEnabled, taxMode, taxPolicyJson }),
    [taxEnabled, taxMode, taxPolicyJson]
  );
  const appliedDiscount = clampCashierDiscountAmount(
    ticketDiscount,
    ticketTotal
  );
  const ticketMoney = displayCashierTicketMoney({
    catalogSubtotal: ticketTotal,
    billDiscountAmount: appliedDiscount,
    taxPolicySnapshot,
  });
  const cashierDisplayName = user?.name?.trim() ?? "";
  const reviewingPreparedInvoice =
    salePhase === "payment" && directSale != null && !paidCheckout;
  const invoiceView = reviewingPreparedInvoice && directSale
    ? buildPreparedCashierInvoiceView({
        orderId: directSale.orderId,
        orderNumber: directSale.orderNumber,
        displayReference: directSale.displayReference,
        createdAt: directSale.createdAt,
        money: directSale.money,
        lines: directSale.lines,
        cashierDisplayName,
        terminalId,
      })
    : buildDraftCashierInvoiceView({
        ticket,
        previewMoney: (() => {
          if (!ticketTotal) return null;
          const projected = projectCashierSaleInvoiceMoney({
            chargesSubtotal: ticketTotal,
            billDiscountAmount: appliedDiscount,
            taxPolicySnapshot,
          });
          return {
            subtotal: projected.subtotal,
            discountAmount: projected.billDiscountAmount,
            taxAmount: projected.taxAmount,
            grandTotal: projected.grandTotal,
          };
        })(),
        cashierDisplayName,
        terminalId,
      });
  const effectiveCashTender =
    tenderMode === "network" || tenderMode == null ? "" : cashReceived;
  const effectiveCardTender =
    tenderMode === "cash" || tenderMode == null ? "" : cardTender;
  const saleReady =
    salePhase === "payment" &&
    selectedOrderId != null &&
    directSale?.orderId != null &&
    directSale.orderId > 0 &&
    !saleMutation.isPending &&
    !paidCheckout;
  const previewGrandTotal =
    invoiceView.money?.grandTotal ??
    paymentDisplayMoney?.grandTotal ??
    ticketMoney?.grandTotal ??
    null;
  const paymentReadiness = resolveCashierPaymentReadiness({
    previewGrandTotal,
    saleReady,
    cashTender: effectiveCashTender,
    cardTender: effectiveCardTender,
    paymentSubmitting: settleMutation.isPending || paymentBusy,
  });
  const amountDue = paymentReadiness.amountDue;
  const sheetMoney = invoiceView.money
    ? {
        subtotal: invoiceView.money.subtotal,
        discount: invoiceView.money.discountAmount,
        taxAmount: invoiceView.money.taxAmount,
        grandTotal: invoiceView.money.grandTotal,
      }
    : paymentDisplayMoney
      ? {
          subtotal: paymentDisplayMoney.subtotal,
          discount: appliedDiscount,
          taxAmount: paymentDisplayMoney.taxAmount,
          grandTotal: paymentDisplayMoney.grandTotal,
        }
      : ticketMoney
        ? {
            subtotal: ticketMoney.subtotal,
            discount: appliedDiscount,
            taxAmount: ticketMoney.taxAmount,
            grandTotal: ticketMoney.grandTotal,
          }
        : null;

  useEffect(() => {
    if (salePhase !== "payment" || paidCheckout || !amountDue) return;
    if (tenderMode === "cash") {
      setCashReceived((current) =>
        current === "" || current === directSale?.totalAmount ? amountDue : current
      );
      setCardTender("");
    } else if (tenderMode === "network") {
      setCardTender((current) =>
        current === "" ? amountDue : current
      );
      setCashReceived("");
    }
  }, [
    salePhase,
    paidCheckout,
    amountDue,
    tenderMode,
    directSale?.totalAmount,
  ]);
  const money = (value: string) =>
    currencySymbol ? `${value} ${currencySymbol}` : value;
  const displayDue = amountDue ?? sheetMoney?.grandTotal ?? null;
  const tenderDraft =
    amountDue != null && tenderMode != null
      ? {
          amountDue,
          cashTender: effectiveCashTender,
          cardTender: effectiveCardTender,
        }
      : null;
  const tenderPlan = tenderDraft
    ? resolveCashierSettlementPlan(tenderDraft)
    : null;
  const displayTenderPlan =
    amountDue == null && displayDue != null && tenderMode != null
      ? resolveCashierSettlementPlan({
          amountDue: displayDue,
          cashTender: effectiveCashTender,
          cardTender: effectiveCardTender,
        })
      : null;
  const tenderedShown =
    paymentReadiness.totalTenderedDisplay ??
    displayCents(displayTenderPlan?.totalEnteredCents ?? 0);
  const remainingShown =
    paymentReadiness.remainingDisplay ??
    (displayTenderPlan
      ? displayCents(displayTenderPlan.remainingCents)
      : displayDue);
  const canConfirmPayment = paymentReadiness.canConfirmPayment;
  const cashChange =
    tenderPlan && tenderPlan.changeCents > 0
      ? displayCents(tenderPlan.changeCents)
      : null;

  useEffect(() => {
    const flowId = cashierFlowIdRef.current;
    if (!flowId || salePhase !== "payment") return;
    if (amountDue) {
      cashierPaymentFlowTiming.mark(flowId, "CASHIER_CHECK_READ_READY");
    }
    if (
      canConfirmPayment &&
      !paymentReadiness.confirmDisabled &&
      tenderMode != null
    ) {
      cashierPaymentFlowTiming.mark(flowId, "CASHIER_PAYMENT_READY");
    }
  }, [
    salePhase,
    amountDue,
    canConfirmPayment,
    paymentReadiness.confirmDisabled,
    tenderMode,
  ]);

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
          : directSale && salePhase === "payment"
            ? t("statusAwaitingPayment")
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
                        disabled={salePhase === "payment" || Boolean(paidCheckout)}
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
              <h2 className="mb-2 text-sm font-semibold text-[#111827]">
                {t("saleInvoice")}
              </h2>
              {(invoiceView.cashierDisplayName || selectedTerminalCode) ? (
              <div className="mb-3 space-y-0.5 text-xs text-[#6b7280]">
                {invoiceView.cashierDisplayName ? (
                  <p>
                    {t("receiptCashier")}: {invoiceView.cashierDisplayName}
                  </p>
                ) : null}
                {selectedTerminalCode ? (
                  <p>
                    {t("terminal")}: {selectedTerminalCode}
                  </p>
                ) : null}
              </div>
              ) : null}
              {invoiceView.lines.length === 0 ? (
                <p className="text-sm text-[#6b7280]">{t("ticketEmpty")}</p>
              ) : (
                <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                  <li className="flex justify-between gap-2 px-1 text-xs text-[#6b7280]">
                    <span>{t("receiptItems")}</span>
                    <span>
                      {t("receiptQty")} · {t("receiptUnitPrice")} ·{" "}
                      {t("invoiceLineTotal")}
                    </span>
                  </li>
                  {invoiceView.lines.map((line) => {
                    const menuItemId = line.menuItemId;
                    return (
                    <li key={line.key} className={cashierPos.ticketLine}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#111827]">
                          {language === "ar" ? line.nameAr : line.nameEn}
                        </p>
                        <p className="text-xs text-[#6b7280]">
                          {line.unitPrice} × {line.quantity}
                        </p>
                      </div>
                      {invoiceView.editable && menuItemId != null ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="size-11"
                            aria-label={
                              line.quantity === 1 ? t("removeLine") : t("qty")
                            }
                            onClick={() => changeQty(menuItemId, -1)}
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
                            onClick={() => changeQty(menuItemId, 1)}
                          >
                            <Plus />
                          </Button>
                        </div>
                      ) : (
                        <span className="w-8 text-center text-sm font-semibold text-[#111827]">
                          {line.quantity}
                        </span>
                      )}
                      <p className="w-16 text-end text-sm font-semibold tabular-nums text-[#111827]">
                        {line.lineTotal}
                      </p>
                    </li>
                    );
                  })}
                </ul>
              )}
              <div className={cashierPos.totalBox}>
                <p className="flex justify-between text-sm text-[#6b7280]">
                  <span>{t("ticketSubtotal")}</span>
                  <span className="tabular-nums">
                    {money(
                      invoiceView.money?.subtotal ??
                        ticketMoney?.subtotal ??
                        ticketTotal ??
                        "0.00"
                    )}
                  </span>
                </p>
                <p className="mt-1 flex justify-between text-sm text-[#6b7280]">
                  <span>{t("ticketDiscount")}</span>
                  <span className="tabular-nums">
                    {isPositiveDisplayMoney(
                      sheetMoney?.discount ?? appliedDiscount
                    )
                      ? `-${money(sheetMoney?.discount ?? appliedDiscount)}`
                      : money("0.00")}
                  </span>
                </p>
                <p className="mt-1 flex justify-between text-sm text-[#6b7280]">
                  <span>{t("paymentTax")}</span>
                  <span className="tabular-nums">
                    {money(
                      sheetMoney?.taxAmount ??
                        ticketMoney?.taxAmount ??
                        "0.00"
                    )}
                  </span>
                </p>
                <p className="mt-2 flex items-end justify-between">
                  <span className="text-sm font-semibold text-[#111827]">
                    {t("ticketTotal")}
                  </span>
                  <span className={cashierPos.totalValue}>
                    {money(
                      sheetMoney?.grandTotal ??
                        ticketMoney?.grandTotal ??
                        ticketTotal ??
                        "0.00"
                    )}
                  </span>
                </p>
                {discountOpen && invoiceView.editable ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      className={cashierPos.moneyInput}
                      inputMode="decimal"
                      aria-label={t("discountAmount")}
                      placeholder={t("discountAmount")}
                      value={discountDraft}
                      onChange={(event) => setDiscountDraft(event.target.value)}
                    />
                    <Button
                      type="button"
                      className="min-h-12"
                      onClick={() => {
                        const next = clampCashierDiscountAmount(
                          discountDraft,
                          ticketTotal
                        );
                        if (
                          discountDraft.trim() &&
                          next !== discountDraft.trim() &&
                          ticketTotal != null
                        ) {
                          toast.error(t("discountExceeds"));
                        }
                        setTicketDiscount(next);
                        setDiscountOpen(false);
                      }}
                    >
                      {t("applyDiscountAction")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-12"
                      onClick={() => {
                        setTicketDiscount("0.00");
                        setDiscountDraft("");
                        setDiscountOpen(false);
                      }}
                    >
                      {t("clearDiscount")}
                    </Button>
                  </div>
                ) : invoiceView.editable ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 min-h-11 w-full"
                    disabled={ticket.length === 0}
                    onClick={() => {
                      setDiscountDraft(
                        appliedDiscount === "0.00" ? "" : appliedDiscount
                      );
                      setDiscountOpen(true);
                    }}
                  >
                    {t("applyDiscount")}
                  </Button>
                ) : null}
              </div>
              <Button
                type="button"
                className={cn(cashierPos.primaryAction, "mt-3")}
                disabled={
                  saleMutation.isPending ||
                  !terminalId ||
                  (directSale
                    ? Boolean(paidCheckout)
                    : ticket.length === 0)
                }
                onClick={() => {
                  if (
                    directSale &&
                    !paidCheckout &&
                    cashierCatalogTicketMatchesInvoiceLines(
                      ticket,
                      directSale.lines
                    )
                  ) {
                    resumePaymentSheet();
                    return;
                  }
                  void placeSale();
                }}
              >
                <ShoppingCart />
                {t("placeSale")}
              </Button>
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

      {salePhase === "payment" ? (
        <div className={cashierPos.overlay} role="dialog" aria-modal="true">
          <div className={cashierPos.sheet} dir={dir}>
                <h2 className="text-lg font-semibold">{t("completePaymentTitle")}</h2>
                {directSale ? (
                  <p className="mt-1 text-sm text-[#6b7280]">
                    {t("receiptInvoiceNumber")}: {directSale.displayReference}
                  </p>
                ) : null}
                {sheetMoney ? (
                  <div className="mt-4 space-y-1">
                    <p className="flex justify-between text-sm text-[#6b7280]">
                      <span>{t("ticketSubtotal")}</span>
                      <span className="tabular-nums">{money(sheetMoney.subtotal)}</span>
                    </p>
                    <p className="flex justify-between text-sm text-[#6b7280]">
                      <span>{t("ticketDiscount")}</span>
                      <span className="tabular-nums">
                        {isPositiveDisplayMoney(sheetMoney.discount)
                          ? `-${money(sheetMoney.discount)}`
                          : money("0.00")}
                      </span>
                    </p>
                    <p className="flex justify-between text-sm text-[#6b7280]">
                      <span>{t("paymentTax")}</span>
                      <span className="tabular-nums">{money(sheetMoney.taxAmount)}</span>
                    </p>
                  </div>
                ) : null}
                <p className="mt-4 text-sm font-medium text-[#6b7280]">
                  {t("amountDue")}
                </p>
                <p className={cashierPos.amountDueHuge}>
                  {amountDue
                    ? money(amountDue)
                    : sheetMoney
                      ? money(sheetMoney.grandTotal)
                      : money("0.00")}
                </p>
                {saleMutation.isPending ? (
                  <p className="mt-1 text-xs text-[#6b7280]">{t("verifyingAmount")}</p>
                ) : null}
                <p className="mb-2 mt-4 text-sm font-medium">{t("selectPaymentMethod")}</p>
                <div className="flex gap-2">
                  {(
                    [
                      ["cash", "tenderCash"],
                      ["network", "tenderNetwork"],
                      ["mixed", "tenderMixed"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={
                        tenderMode === mode
                          ? cashierPos.methodBtnActive
                          : cashierPos.methodBtn
                      }
                      onClick={() => {
                        setTenderMode(mode);
                        if (mode === "cash") {
                          setPaymentMethod("cash");
                          setCardTender("");
                          setCashReceived(amountDue ?? sheetMoney?.grandTotal ?? "");
                        } else if (mode === "network") {
                          setPaymentMethod("card");
                          setCashReceived("");
                          setCardTender(amountDue ?? sheetMoney?.grandTotal ?? "");
                        } else {
                          setPaymentMethod("cash");
                          setCashReceived("");
                          setCardTender("");
                        }
                      }}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
                {tenderMode === "cash" || tenderMode === "mixed" ? (
                  <div className="mt-3">
                    <label className="text-sm font-medium" htmlFor="cashier-tender-cash">
                      {t("tenderCash")}
                    </label>
                    <input
                      id="cashier-tender-cash"
                      className={cn(cashierPos.moneyInput, "mt-1")}
                      inputMode="decimal"
                      disabled={paying}
                      value={cashReceived}
                      onChange={(event) => {
                        const next = event.target.value;
                        setCashReceived(next);
                        persistDirectSaleSnapshot({
                          received: next,
                          method: "cash",
                        });
                      }}
                    />
                  </div>
                ) : null}
                {tenderMode === "network" || tenderMode === "mixed" ? (
                  <div className="mt-3">
                    <label className="text-sm font-medium" htmlFor="cashier-tender-card">
                      {t("tenderNetwork")}
                    </label>
                    <input
                      id="cashier-tender-card"
                      className={cn(cashierPos.moneyInput, "mt-1")}
                      inputMode="decimal"
                      disabled={paying}
                      value={cardTender}
                      onChange={(event) => {
                        const next = event.target.value;
                        setCardTender(next);
                        persistDirectSaleSnapshot({
                          card: next,
                          method: "card",
                        });
                      }}
                    />
                  </div>
                ) : null}
                {tenderMode != null ? (
                  <>
                <p className="mt-3 flex justify-between text-sm">
                  <span>{t("totalTendered")}</span>
                  <span className="tabular-nums font-semibold">
                    {money(tenderedShown)}
                  </span>
                </p>
                <p className="mt-1 flex justify-between text-sm">
                  <span>{t("remainingAmount")}</span>
                  <span className="tabular-nums font-semibold">
                    {money(remainingShown ?? "0.00")}
                  </span>
                </p>
                  </>
                ) : null}
                {cashChange ? (
                  <p className="mt-1 flex justify-between text-sm">
                    <span>{t("changeDue")}</span>
                    <span className="tabular-nums font-semibold">{money(cashChange)}</span>
                  </p>
                ) : null}
                {tenderPlan && tenderPlan.remainingCents > 0 ? (
                  <p className="mt-1 text-sm text-red-700">{t("underpayment")}</p>
                ) : null}
                {paymentReadiness.showCardOverTender ? (
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
                    disabled={paying || saleMutation.isPending}
                    onClick={cancelPaymentSheet}
                  >
                    {t("cancelPayment")}
                  </Button>
                  <Button
                    type="button"
                    className={cn(cashierPos.primaryAction, "flex-1")}
                    disabled={
                      paymentReadiness.confirmDisabled ||
                      tenderMode == null
                    }
                    onClick={() => void completePayment()}
                  >
                    {paying ? t("paying") : t("confirmPayment")}
                  </Button>
                </div>
          </div>
        </div>
      ) : null}
      </div>

      <CashierPaidReceiptDialog
        open={printOpen}
        language={language}
        receipt={paidReceipt}
        onOpenChange={setPrintOpen}
      />
    </section>
  );
}
