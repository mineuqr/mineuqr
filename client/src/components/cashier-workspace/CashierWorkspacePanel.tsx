/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1
 * Restaurant Dashboard cashier workspace. Presentation + existing POS tRPC only.
 * CASHIER-SALE-INVOICE-UX-REALIGNMENT-1 — left workspace is SALE/INVOICE.
 * CASHIER-PAYMENT-CANCEL-RETURN-TO-EDITABLE-1 — Cancel Payment restores
 * catalog editing on the same Order. P# / date / time stay off the left
 * panel until Confirm / Paid Receipt.
 * CASHIER-PASS-2-CONFIRM-FINALIZATION-1 — الدفع opens Payment UI only.
 * Confirm (تأكيد الدفع) finalizes Order + Collection Fact = PAID.
 * CASHIER-UX-REDESIGN-1 — initial three-rail POS workspace.
 * CASHIER-UX-REDESIGN-2 — UX correction: top Incoming notification, left
 * Current Sale, wide Product Catalog, payment as focused modal/sheet.
 * Tender modes remain Cash / Network / Mixed / Complimentary.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import {
  AppEmptyState,
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from "@/components/app-state";
import { CashierPaidReceiptDialog } from "@/components/cashier-workspace/CashierPaidReceiptDialog";
import { CashierCustomerBar } from "@/components/cashier-workspace/CashierCustomerBar";
import { CashierProductCard } from "@/components/cashier-workspace/CashierProductCard";
import { Button } from "@/components/ui/button";
import {
  cashierAllCategoryIcon,
  cashierFavoritesCategoryIcon,
  resolveCashierCategoryIcon,
} from "@/lib/cashier-workspace/cashierCategoryIcon";
import {
  cashierAllCategoryTint,
  cashierFavoritesCategoryTint,
  resolveCashierCategoryTint,
} from "@/lib/cashier-workspace/cashierCategoryTint";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  readCashierFavoriteIds,
  toggleCashierFavoriteId,
} from "@/lib/cashier-workspace/cashierFavoritesStorage";
import { cashierPos } from "@/lib/cashier-workspace/cashierPosStyles";
import {
  classifyCashierRegisterGap,
  type CashierRegisterGapKind,
} from "@/lib/cashier-workspace/cashierRegisterGap";
import {
  cashierPendingSaleAttemptAppliesToOrder,
  clearCashierPendingSaleAttempt,
  readCashierPendingSaleAttempt,
  writeCashierPendingSaleAttempt,
} from "@/lib/cashier-workspace/cashierPendingSaleAttemptStorage";
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
  cashierDiscountExceedsCatalogSubtotal,
  cashierDisplayTaxPolicy,
  displayCashierTicketMoney,
} from "@/lib/cashier-workspace/cashierTicketMoney";
import {
  buildDraftCashierInvoiceView,
  buildPreparedCashierInvoiceView,
  cashierCatalogTicketMatchesInvoiceLines,
  cashierTicketMatchesSaleAttempt,
  chargesSubtotalFromInvoiceLines,
  catalogTicketFromInvoiceLines,
  mapDraftTicketToPreparedInvoiceLines,
  projectPreparedCashierInvoiceMoney,
  toCashierSaleCreateMoney,
  invoiceIntentLinesToCashierView,
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
import { cn } from "@/lib/utils";
import type { CheckMoneyResult } from "@shared/operational-session";
import type { SelectablePaymentMethod } from "@shared/operational-session";
import { projectCashierSaleInvoiceMoney } from "@shared/operational-session";
import type { InvoiceIntent } from "@shared/pos";
import {
  Banknote,
  Combine,
  CreditCard,
  Gift,
  Minus,
  Plus,
  QrCode,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type CategoryFilter = number | "all" | "favorites";
type CatalogSort = "default" | "name" | "price";

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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [productSearch, setProductSearch] = useState("");
  const [catalogSort, setCatalogSort] = useState<CatalogSort>("default");
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() =>
    readCashierFavoriteIds(restaurantId)
  );
  const [flashItemId, setFlashItemId] = useState<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: number;
    displayName: string;
  } | null>(null);
  const [cashReceived, setCashReceived] = useState("");
  const [cardTender, setCardTender] = useState("");
  const [tenderMode, setTenderMode] = useState<CashierTenderMode | null>(null);
  const [ticketDiscount, setTicketDiscount] = useState("0.00");
  const [discountDraft, setDiscountDraft] = useState("");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [paymentDisplayMoney, setPaymentDisplayMoney] =
    useState<CheckMoneyResult | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [incomingOpen, setIncomingOpen] = useState(false);
  const [incomingPulse, setIncomingPulse] = useState(false);
  const [salePanelOpen, setSalePanelOpen] = useState(false);
  const prevIncomingCountRef = useRef(0);
  const [printOpen, setPrintOpen] = useState(false);
  const [paidReceipt, setPaidReceipt] =
    useState<CashierPaidReceiptSnapshot | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const saleInFlightRef = useRef(false);
  const payInFlightRef = useRef(false);
  const saleAttemptItemsRef = useRef<
    ReadonlyArray<{ menuItemId: number; quantity: number }> | null
  >(null);
  const settleKeyRef = useRef<string | null>(null);
  const paymentIntentRef = useRef<string | null>(null);
  const saleAttemptOrderIdRef = useRef<number | null>(null);
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
    setProductSearch("");
    setCatalogSort("default");
    setFavoriteIds(readCashierFavoriteIds(restaurantId));
    setFlashItemId(null);
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
    const pendingAttempt = readCashierPendingSaleAttempt(restaurantId);
    settleKeyRef.current = pendingAttempt?.idempotencyKey ?? null;
    paymentIntentRef.current = pendingAttempt?.paymentIntentId ?? null;
    saleAttemptItemsRef.current = pendingAttempt?.items ?? null;
    saleAttemptOrderIdRef.current = pendingAttempt?.orderId ?? null;
    const snapshot = readCashierDirectSale(restaurantId);
    if (snapshot) {
      const lines = snapshot.invoice?.lines ?? [];
      const canResumePayment = lines.length > 0;
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
              lines,
            }
          : null
      );
      setSelectedOrderId(null);
      setSalePhase(canResumePayment ? snapshot.phase : "ticket");
      setPaymentMethod(snapshot.paymentMethod);
      setCashReceived(snapshot.cashReceived);
      setCardTender(snapshot.cardTender ?? "");
      setOpenCheck(null);
      const restoredTicket = catalogTicketFromInvoiceLines(
        snapshot.invoice?.lines ?? []
      );
      if (restoredTicket.length > 0) setTicket(restoredTicket);
      const restoredDiscount =
        snapshot.invoice?.money.billDiscountAmount ?? "0.00";
      setTicketDiscount(restoredDiscount);
      setDiscountDraft("");
      if (snapshot.selectedCustomer && snapshot.selectedCustomer.id > 0) {
        setSelectedCustomer({
          id: snapshot.selectedCustomer.id,
          displayName: snapshot.selectedCustomer.displayName,
        });
      } else {
        setSelectedCustomer(null);
      }
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
      setTicketDiscount("0.00");
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
    { restaurantId, terminalId: terminalId ?? "", availableOnly: false },
    { enabled: scoped && allowed }
  );
  const ordersQuery = trpc.pos.read.orders.listActive.useQuery(
    { restaurantId, terminalId: terminalId ?? "", status: "all-active", limit: 50 },
    { enabled: scoped && allowed && ordersOpen, staleTime: 0 }
  );
  const invoiceIntentsQuery = trpc.pos.read.orders.listInvoiceIntents.useQuery(
    { restaurantId, terminalId: terminalId ?? "", limit: 50 },
    { enabled: scoped && allowed, staleTime: 0 }
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
  const settleMutation = trpc.pos.settlement.initiate.useMutation();

  function invalidateOrderReads() {
    void utils.pos.read.orders.listActive.invalidate();
    void utils.pos.read.orders.listInvoiceIntents.invalidate();
    void utils.pos.read.orders.getInvoiceIntent.invalidate();
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
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashItemId(item.menuItemId);
    flashTimerRef.current = setTimeout(() => setFlashItemId(null), 280);
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

  function hydrateAwaitingInvoiceIntent(intent: InvoiceIntent): DirectSale | null {
    if (intent.status !== "awaiting_cashier") return null;
    const lines = invoiceIntentLinesToCashierView(intent.items);
    const catalogSubtotal =
      chargesSubtotalFromInvoiceLines(lines) ?? intent.expectedGrandTotal;
    const discount = clampCashierDiscountAmount("0.00", catalogSubtotal);
    setTicketDiscount(discount);
    const preview = displayCashierTicketMoney({
      catalogSubtotal,
      billDiscountAmount: discount,
      taxPolicySnapshot: cashierDisplayTaxPolicy({
        taxEnabled,
        taxMode,
        taxPolicyJson,
      }),
    });
    const sale: DirectSale = applyPreparedPayableDiscount(
      {
        orderId: intent.orderId,
        orderNumber: intent.orderNumber,
        displayReference: intent.displayReference || intent.orderNumber,
        totalAmount: preview?.grandTotal ?? intent.expectedGrandTotal,
        createdAt: "",
        money: {
          subtotal: preview?.subtotal ?? catalogSubtotal,
          taxAmount: preview?.taxAmount ?? "0.00",
          grandTotal: preview?.grandTotal ?? intent.expectedGrandTotal,
          billDiscountAmount: discount,
        },
        lines,
      },
      discount
    );
    setTicket(catalogTicketFromInvoiceLines(lines));
    setDirectSale(sale);
    setSelectedOrderId(intent.orderId);
    setOpenCheck(null);
    setPaidCheckout(null);
    setPaymentMethod(null);
    setRegisterGap(null);
    setTenderMode(null);
    setCashReceived("");
    setCardTender("");
    setPaymentDisplayMoney(preview);
    return sale;
  }

  /** Select Incoming for view/edit — hydrate Current Sale only (no Payment). */
  function reviewInvoiceIntent(intent: InvoiceIntent) {
    const sale = hydrateAwaitingInvoiceIntent(intent);
    if (!sale) return;
    persistDirectSaleSnapshot({
      sale,
      phase: "ticket",
      checkId: null,
      paid: null,
      method: null,
      received: "",
      card: "",
    });
    setSalePhase("ticket");
    setSalePanelOpen(true);
  }

  /**
   * Collect Invoice — revalidate Intent, hydrate sale, open existing Payment UI
   * (same entry as PAY / resumePaymentSheet). No editable-ticket intermediate.
   */
  async function collectIncomingInvoice(orderId: number) {
    if (!terminalId || paidCheckout) return;
    try {
      const intent = await utils.pos.read.orders.getInvoiceIntent.fetch({
        restaurantId,
        terminalId,
        orderId,
      });
      const sale = hydrateAwaitingInvoiceIntent(intent);
      if (!sale) return;
      setIncomingOpen(false);
      setSalePanelOpen(true);
      resumePaymentSheet(sale);
    } catch {
      // Settled or non-finalizable: do not open Payment.
    }
  }

  async function selectOrder(orderId: number) {
    if (directSale?.orderId === orderId && !paidCheckout) {
      setSelectedOrderId(orderId);
      return;
    }
    setSelectedOrderId(orderId);
    setOpenCheck(null);
    setPaidCheckout(null);
    setPaymentMethod(null);
    setRegisterGap(null);
    if (!terminalId) return;
    try {
      // Revalidate on click: list Intent can be stale (paid/cancelled/revoked
      // handoff). Do not hydrate the ticket from the list card alone.
      const intent = await utils.pos.read.orders.getInvoiceIntent.fetch({
        restaurantId,
        terminalId,
        orderId,
      });
      if (intent.status === "awaiting_cashier") {
        reviewInvoiceIntent(intent);
      }
    } catch {
      // Settled or non-finalizable: browse only.
    }
  }

  function persistDirectSaleSnapshot(next?: {
    phase?: DirectSalePhase;
    sale?: DirectSale | null;
    checkId?: number | null;
    paid?: PaidCheckoutResult | null;
    method?: SelectablePaymentMethod | null;
    received?: string;
    card?: string;
    customer?: { id: number; displayName: string } | null;
  }) {
    const sale = next?.sale === undefined ? directSale : next.sale;
    const phase = next?.phase ?? salePhase;
    if (!sale) {
      clearCashierDirectSale(restaurantId);
      return;
    }
    writeCashierDirectSale(restaurantId, {
      v: 4,
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
      selectedCustomer:
        next?.customer === undefined ? selectedCustomer : next.customer,
      invoice: {
        createdAt: sale.createdAt,
        money: sale.money,
        lines: sale.lines,
      },
      paid: next?.paid === undefined ? paidCheckout : next.paid,
    });
  }

  function applyPreparedPayableDiscount(
    sale: DirectSale,
    billDiscountAmount: string
  ): DirectSale {
    const projected = projectPreparedCashierInvoiceMoney({
      lines: sale.lines,
      billDiscountAmount,
      taxPolicySnapshot: cashierDisplayTaxPolicy({
        taxEnabled,
        taxMode,
        taxPolicyJson,
      }),
    });
    if (!projected) return { ...sale, money: { ...sale.money, billDiscountAmount } };
    return {
      ...sale,
      money: toCashierSaleCreateMoney(projected),
    };
  }

  function startNewSale() {
    // Clear the current sale only. Paid receipt snapshot / print stay open.
    endCashierPaymentFlow("abandoned");
    saleInFlightRef.current = false;
    payInFlightRef.current = false;
    setPaymentBusy(false);
    saleAttemptItemsRef.current = null;
    settleKeyRef.current = null;
    paymentIntentRef.current = null;
    saleAttemptOrderIdRef.current = null;
    setTicket([]);
    setSelectedOrderId(null);
    setOpenCheck(null);
    setPaidCheckout(null);
    setPaymentMethod(null);
    setRegisterGap(null);
    setDirectSale(null);
    setSalePhase("ticket");
    setSelectedCustomer(null);
    setCashReceived("");
    setCardTender("");
    setTenderMode(null);
    setTicketDiscount("0.00");
    setDiscountDraft("");
    setDiscountOpen(false);
    setPaymentDisplayMoney(null);
    clearCashierPendingSaleAttempt(restaurantId);
    clearCashierDirectSale(restaurantId);
  }

  function cancelPaymentSheet() {
    if (
      payInFlightRef.current ||
      settleMutation.isPending ||
      paymentBusy ||
      saleInFlightRef.current
    ) {
      return;
    }
    // Close Payment review. Restore editing. No persisted Order exists yet.
    endCashierPaymentFlow("cancelled");
    const restored = catalogTicketFromInvoiceLines(directSale?.lines ?? []);
    if (restored.length > 0) setTicket(restored);
    setSalePhase("ticket");
    persistDirectSaleSnapshot({ phase: "ticket" });
  }

  function resumePaymentSheet(sale?: DirectSale) {
    const next = sale ?? directSale;
    if (!next || paidCheckout) return;
    if (sale) setDirectSale(sale);
    setSalePhase("payment");
    persistDirectSaleSnapshot({ sale: next, phase: "payment" });
  }

  function placeSale() {
    if (!terminalId || ticket.length === 0) return;
    if (saleInFlightRef.current) return;
    if (paidCheckout) return;
    if (
      directSale &&
      cashierCatalogTicketMatchesInvoiceLines(ticket, directSale.lines)
    ) {
      const catalogSubtotal = displayTicketTotal(ticket);
      const discount = clampCashierDiscountAmount(ticketDiscount, catalogSubtotal);
      setTicketDiscount(discount);
      resumePaymentSheet(applyPreparedPayableDiscount(directSale, discount));
      return;
    }
    const pendingItems = saleAttemptItemsRef.current;
    const currentOrderId =
      directSale && directSale.orderId > 0 ? directSale.orderId : null;
    if (
      cashierPendingSaleAttemptAppliesToOrder(
        { orderId: saleAttemptOrderIdRef.current },
        currentOrderId
      ) &&
      settleKeyRef.current &&
      pendingItems &&
      !cashierTicketMatchesSaleAttempt(ticket, pendingItems)
    ) {
      toast.error(t("saleRetrySameItems"));
      return;
    }
    endCashierPaymentFlow("abandoned");
    cashierFlowIdRef.current = cashierPaymentFlowTiming.beginFlow({
      restaurantId,
      terminalId,
    });
    cashierPaymentFlowTiming.mark(
      cashierFlowIdRef.current,
      "CASHIER_ORDER_CONFIRM_CLICK"
    );
    setPaidCheckout(null);
    setRegisterGap(null);
    setPaymentMethod(null);
    setTenderMode(null);
    setCashReceived("");
    setCardTender("");
    const catalogSubtotal = displayTicketTotal(ticket);
    const discount = clampCashierDiscountAmount(ticketDiscount, catalogSubtotal);
    setTicketDiscount(discount);
    const preview = displayCashierTicketMoney({
      catalogSubtotal,
      billDiscountAmount: discount,
      taxPolicySnapshot: cashierDisplayTaxPolicy({
        taxEnabled,
        taxMode,
        taxPolicyJson,
      }),
    });
    setPaymentDisplayMoney(preview);
    const lines = mapDraftTicketToPreparedInvoiceLines(ticket);
    const payable = applyPreparedPayableDiscount(
      {
        orderId: 0,
        orderNumber: "",
        displayReference: "",
        totalAmount: preview?.grandTotal ?? catalogSubtotal ?? "0.00",
        createdAt: "",
        money: {
          subtotal: preview?.subtotal ?? catalogSubtotal ?? "0.00",
          taxAmount: preview?.taxAmount ?? "0.00",
          grandTotal: preview?.grandTotal ?? catalogSubtotal ?? "0.00",
          billDiscountAmount: discount,
        },
        lines,
      },
      discount
    );
    setSelectedOrderId(null);
    setOpenCheck(null);
    setDirectSale(payable);
    persistDirectSaleSnapshot({
      sale: payable,
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
  }

  async function completePayment() {
    if (!terminalId || !directSale || directSale.lines.length === 0) return;
    const confirmItems = directSale.lines.flatMap((line) =>
      line.menuItemId != null && line.menuItemId > 0
        ? [{ menuItemId: line.menuItemId, quantity: line.quantity }]
        : []
    );
    const inboundOrderId = directSale.orderId > 0 ? directSale.orderId : null;
    if (!inboundOrderId) {
      if (confirmItems.length === 0 || confirmItems.length !== directSale.lines.length) {
        return;
      }
    }
    if (payInFlightRef.current || settleMutation.isPending) return;
    const complimentarySale = tenderMode === "complimentary";
    if (tenderMode == null) return;
    const due = amountDue;
    if (!due) return;
    const cashTender = complimentarySale
      ? ""
      : tenderMode === "network"
        ? ""
        : cashReceived;
    const cardTenderValue = complimentarySale
      ? ""
      : tenderMode === "cash"
        ? ""
        : cardTender;
    const plan = complimentarySale
      ? null
      : resolveCashierSettlementPlan({
          amountDue: due,
          cashTender,
          cardTender: cardTenderValue,
        });
    if (
      !complimentarySale &&
      (!plan ||
        !canConfirmCashierSettlement({
          amountDue: due,
          cashTender,
          cardTender: cardTenderValue,
        }))
    ) {
      return;
    }
    const pendingItems = saleAttemptItemsRef.current;
    const pendingApplies = cashierPendingSaleAttemptAppliesToOrder(
      { orderId: saleAttemptOrderIdRef.current },
      inboundOrderId
    );
    if (pendingApplies) {
      if (
        settleKeyRef.current &&
        pendingItems &&
        !cashierTicketMatchesSaleAttempt(confirmItems, pendingItems)
      ) {
        toast.error(t("saleRetrySameItems"));
        return;
      }
    } else {
      settleKeyRef.current = null;
      paymentIntentRef.current = null;
      saleAttemptItemsRef.current = null;
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
    saleAttemptItemsRef.current = confirmItems;
    saleAttemptOrderIdRef.current = inboundOrderId;
    writeCashierPendingSaleAttempt(restaurantId, {
      idempotencyKey: settleKeyRef.current,
      paymentIntentId: paymentIntentRef.current,
      items: confirmItems,
      orderId: inboundOrderId,
    });
    try {
      cashierPaymentFlowTiming.mark(
        cashierFlowIdRef.current,
        "CASHIER_SETTLEMENT_REQUEST_START"
      );
      const result = await settleMutation.mutateAsync({
        restaurantId,
        terminalId,
        ...(inboundOrderId
          ? { orderId: inboundOrderId }
          : { items: confirmItems }),
        idempotencyKey: settleKeyRef.current,
        paymentIntentId: paymentIntentRef.current,
        ...(selectedCustomer
          ? { customerId: selectedCustomer.id }
          : { customerId: null }),
        ...(complimentarySale
          ? { complimentary: true }
          : {
              paymentMethod: plan!.paymentMethod,
              settlements: [...plan!.settlements],
            }),
        ...(directSale.money.billDiscountAmount &&
        directSale.money.billDiscountAmount !== "0.00" &&
        !complimentarySale
          ? { billDiscountAmount: directSale.money.billDiscountAmount }
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
      cashierPaymentFlowTiming.attachOrderId(
        cashierFlowIdRef.current,
        result.orderId
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
        `${t("paidSuccess")} · ${receipt?.invoiceNumber?.trim() || receipt?.displayReference || ""} · ${result.grandTotal}`
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
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const visibleItems = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    let list = items.filter((item) => {
      if (categoryFilter === "favorites") {
        if (!favoriteIdSet.has(item.menuItemId)) return false;
      } else if (categoryFilter !== "all" && item.categoryId !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      const name =
        language === "ar"
          ? `${item.nameAr} ${item.nameEn ?? ""}`
          : `${item.nameEn ?? ""} ${item.nameAr}`;
      return name.toLowerCase().includes(q);
    });
    if (catalogSort === "name") {
      list = [...list].sort((a, b) => {
        const an = language === "ar" ? a.nameAr : a.nameEn ?? a.nameAr;
        const bn = language === "ar" ? b.nameAr : b.nameEn ?? b.nameAr;
        return an.localeCompare(bn, language === "ar" ? "ar" : "en");
      });
    } else if (catalogSort === "price") {
      list = [...list].sort((a, b) => a.price.localeCompare(b.price, undefined, { numeric: true }));
    } else {
      list = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return list;
  }, [
    items,
    categoryFilter,
    favoriteIdSet,
    productSearch,
    catalogSort,
    language,
  ]);
  const orders = ordersQuery.data?.items ?? [];
  const awaitingIntents = invoiceIntentsQuery.data ?? [];
  useEffect(() => {
    const count = awaitingIntents.length;
    if (count > prevIncomingCountRef.current) {
      setIncomingPulse(true);
      const timer = setTimeout(() => setIncomingPulse(false), 2400);
      prevIncomingCountRef.current = count;
      return () => clearTimeout(timer);
    }
    prevIncomingCountRef.current = count;
  }, [awaitingIntents.length]);
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
    tenderMode === "network" ||
    tenderMode === "complimentary" ||
    tenderMode == null
      ? ""
      : cashReceived;
  const effectiveCardTender =
    tenderMode === "cash" ||
    tenderMode === "complimentary" ||
    tenderMode == null
      ? ""
      : cardTender;
  const saleReady =
    salePhase === "payment" &&
    directSale != null &&
    directSale.lines.length > 0 &&
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
    complimentary: tenderMode === "complimentary",
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
    if (tenderMode === "complimentary") {
      setCashReceived("");
      setCardTender("");
      return;
    }
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
  const selectedIncoming =
    awaitingIntents.find((intent) => intent.orderId === selectedOrderId) ??
    awaitingIntents.find((intent) => intent.orderId === directSale?.orderId) ??
    null;
  const orderSourceLabel = (() => {
    const channel = selectedIncoming?.sourceChannel?.toLowerCase() ?? "";
    if (channel.includes("qr")) return t("orderSourceQr");
    if (channel.includes("waiter")) return t("orderSourceWaiter");
    if (channel.includes("table")) return t("orderSourceTable");
    if (directSale && directSale.orderId > 0) return t("orderSourceQr");
    if (ticket.length > 0 || directSale) return t("orderSourceCashier");
    return null;
  })();
  const displayOrderNumber =
    (invoiceView.orderId != null && invoiceView.orderId > 0
      ? invoiceView.orderNumber
      : null) ??
    (directSale && directSale.orderId > 0 ? directSale.orderNumber : null) ??
    selectedIncoming?.orderNumber ??
    null;
  const displayTableNumber = selectedIncoming?.tableNumber ?? null;
  const payAmountLabel = money(
    sheetMoney?.grandTotal ??
      ticketMoney?.grandTotal ??
      ticketTotal ??
      "0.00"
  );
  const paymentOpen = salePhase === "payment" && !paidCheckout;
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
  const operationalStatus = paying
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
        <label className="flex min-h-11 items-center gap-2 text-sm text-[#111827]">
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
          <button
            type="button"
            className={cashierPos.headerBtn}
            onClick={startNewSale}
            disabled={paying}
          >
            {t("newSale")}
          </button>
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
        <>
          {/* TOP — Incoming QR + Search + Sort */}
          <div className={cashierPos.incomingBar}>
            <Popover open={incomingOpen} onOpenChange={setIncomingOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    incomingOpen
                      ? cashierPos.incomingTriggerActive
                      : cashierPos.incomingTrigger,
                    incomingPulse && cashierPos.incomingTriggerPulse
                  )}
                  aria-label={t("incomingOpenPanel")}
                >
                  <QrCode className="size-5 text-[#4f46e5]" aria-hidden />
                  <span>
                    <span className={cashierPos.incomingLabel}>
                      {t("incomingOrders")}
                    </span>
                    <span className={cn(cashierPos.incomingHint, "ms-2")}>
                      {t("incomingCount")}
                    </span>
                  </span>
                  <span
                    className={
                      awaitingIntents.length > 0
                        ? cashierPos.incomingBadge
                        : cashierPos.incomingBadgeIdle
                    }
                  >
                    {awaitingIntents.length}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-auto border-0 bg-transparent p-0 shadow-none"
                dir={dir}
              >
                <div className={cashierPos.incomingPanel}>
                  <div className={cashierPos.incomingPanelHeader}>
                    <h2 className={cashierPos.contextualTitle}>
                      {t("incomingOrders")}
                    </h2>
                    <span className={cashierPos.contextualBadge}>
                      {awaitingIntents.length}
                    </span>
                  </div>
                  <div className={cashierPos.incomingPanelScroll}>
                    {invoiceIntentsQuery.isPending ? (
                      <AppLoadingState label={t("loading")} />
                    ) : awaitingIntents.length === 0 ? (
                      <p className="text-sm text-[#111827]">
                        {t("noIncomingOrders")}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {awaitingIntents.map((intent) => (
                          <li key={intent.invoiceIntentId}>
                            <div
                              className={
                                selectedOrderId === intent.orderId
                                  ? cashierPos.orderBtnActive
                                  : cashierPos.orderBtn
                              }
                            >
                              <button
                                type="button"
                                className="w-full text-start"
                                onClick={() => {
                                  void selectOrder(intent.orderId);
                                  setIncomingOpen(false);
                                }}
                              >
                                <span className="block text-base font-semibold text-[#111827]">
                                  #{intent.orderNumber}
                                </span>
                                <span className="mt-0.5 block text-xs font-medium text-[#4f46e5]">
                                  {t("orderSourceQr")}
                                  {intent.tableNumber != null
                                    ? ` · ${t("incomingTable")} ${intent.tableNumber}`
                                    : ""}
                                </span>
                                <span className="mt-1 block text-xs text-[#111827]">
                                  {t("incomingOperationalOrder")}{" "}
                                  {intent.displayReference || intent.orderNumber}
                                  {" · "}
                                  {intent.sourceChannel}
                                  {" · "}
                                  {intent.items.length} {t("incomingOrderItems")}
                                  {" · "}
                                  {intent.expectedGrandTotal}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#4f46e5] px-3 text-sm font-semibold text-white active:bg-[#3730a3]"
                                onClick={() => {
                                  void collectIncomingInvoice(intent.orderId);
                                }}
                              >
                                {t("incomingPayAction")}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      className={cn(cashierPos.secondaryAction, "mt-3")}
                      onClick={() => setOrdersOpen((open) => !open)}
                    >
                      {ordersOpen
                        ? t("hideActiveOrders")
                        : t("showActiveOrders")}
                    </button>
                    {ordersOpen ? (
                      <div className="mt-3">
                        {ordersQuery.isPending ? (
                          <AppLoadingState label={t("loading")} />
                        ) : orders.length === 0 ? (
                          <p className="text-sm text-[#111827]">
                            {t("noOrders")}
                          </p>
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
                                  onClick={() => {
                                    void selectOrder(order.orderId);
                                    setIncomingOpen(false);
                                  }}
                                >
                                  <span className="block font-medium text-[#111827]">
                                    {order.displayReference ||
                                      order.orderNumber}
                                  </span>
                                  <span className="text-xs text-[#111827]">
                                    {order.status} · {order.totalAmount}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className={cashierPos.topSearchSort}>
              <input
                className={cashierPos.catalogSearch}
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder={t("productSearch")}
                aria-label={t("productSearch")}
              />
              <label className="sr-only" htmlFor="cashier-catalog-sort">
                {t("sortBy")}
              </label>
              <select
                id="cashier-catalog-sort"
                className={cashierPos.catalogSort}
                value={catalogSort}
                aria-label={t("sortBy")}
                onChange={(event) =>
                  setCatalogSort(event.target.value as CatalogSort)
                }
              >
                <option value="default">{t("sortDefault")}</option>
                <option value="name">{t("sortName")}</option>
                <option value="price">{t("sortPrice")}</option>
              </select>
            </div>
          </div>

          <div className={cashierPos.body}>
            {salePanelOpen ? (
              <button
                type="button"
                className={cashierPos.saleBackdrop}
                aria-label={t("closeSalePanel")}
                onClick={() => setSalePanelOpen(false)}
              />
            ) : null}
            {/* LEFT / sheet — Current Sale */}
            <section
              className={cn(
                cashierPos.orderRail,
                salePanelOpen
                  ? cashierPos.orderRailOpen
                  : cashierPos.orderRailClosed
              )}
              aria-label={t("currentOrder")}
            >
              <div className={cashierPos.orderSheetHandle} aria-hidden />
              <button
                type="button"
                className={cashierPos.orderSheetClose}
                aria-label={t("closeSalePanel")}
                onClick={() => setSalePanelOpen(false)}
              >
                <X className="size-5" />
              </button>
              <div className={cashierPos.orderBody}>
                <div className={cashierPos.orderHeader}>
                  <p className={cashierPos.orderSource}>
                    {orderSourceLabel
                      ? displayTableNumber != null
                        ? `${orderSourceLabel} · ${t("incomingTable")} ${displayTableNumber}`
                        : orderSourceLabel
                      : t("currentOrder")}
                  </p>
                  <h2 className={cashierPos.orderHeading}>
                    {displayOrderNumber
                      ? `#${displayOrderNumber}`
                      : t("saleInvoice")}
                  </h2>
                  {(invoiceView.cashierDisplayName ||
                    selectedTerminalCode ||
                    (directSale?.displayReference &&
                      directSale.displayReference !== displayOrderNumber)) ? (
                    <div className={cashierPos.orderMeta}>
                      {directSale?.displayReference &&
                      directSale.displayReference !== displayOrderNumber ? (
                        <p>{directSale.displayReference}</p>
                      ) : null}
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
                </div>

                <div className="mx-3 mb-2">
                  <CashierCustomerBar
                    restaurantId={restaurantId}
                    language={language === "ar" ? "ar" : "en"}
                    selected={selectedCustomer}
                    onSelect={(customer) => {
                      setSelectedCustomer(customer);
                      if (directSale) {
                        persistDirectSaleSnapshot({ customer });
                      }
                    }}
                    onClear={() => {
                      setSelectedCustomer(null);
                      if (directSale) {
                        persistDirectSaleSnapshot({ customer: null });
                      }
                    }}
                  />
                </div>

                {invoiceView.lines.length === 0 ? (
                  <div className={cn(cashierPos.orderEmpty, "mx-3 my-2")}>
                    <p className={cashierPos.orderEmptyTitle}>
                      {t("noActiveOrder")}
                    </p>
                    <p className={cashierPos.orderEmptyHint}>
                      {t("noActiveOrderHint")}
                    </p>
                  </div>
                ) : (
                  <ul className={cashierPos.orderLines}>
                    {invoiceView.lines.map((line) => {
                      const menuItemId = line.menuItemId;
                      return (
                        <li key={line.key} className={cashierPos.ticketLine}>
                          <p className={cashierPos.ticketLineName}>
                            {language === "ar" ? line.nameAr : line.nameEn}
                          </p>
                          {invoiceView.editable && menuItemId != null ? (
                            <>
                              <div className={cashierPos.ticketLineControls}>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="size-9 shrink-0"
                                  aria-label={t("qty")}
                                  onClick={() => changeQty(menuItemId, -1)}
                                >
                                  <Minus />
                                </Button>
                                <span className={cashierPos.ticketLineQty}>
                                  {line.quantity}
                                </span>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="size-9 shrink-0"
                                  aria-label={t("qty")}
                                  onClick={() => changeQty(menuItemId, 1)}
                                >
                                  <Plus />
                                </Button>
                              </div>
                              <p className={cashierPos.ticketLinePrice}>
                                {line.lineTotal}
                              </p>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className={cashierPos.ticketLineDelete}
                                aria-label={t("removeLine")}
                                onClick={() =>
                                  changeQty(menuItemId, -line.quantity)
                                }
                              >
                                <Trash2 />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span
                                className={cn(
                                  cashierPos.ticketLineControls,
                                  "pointer-events-none"
                                )}
                              >
                                <span className={cashierPos.ticketLineQty}>
                                  {line.quantity}
                                </span>
                              </span>
                              <p className={cashierPos.ticketLinePrice}>
                                {line.lineTotal}
                              </p>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className={cashierPos.orderFooter}>
                <div className={cashierPos.totalBox}>
                  <p className={cashierPos.summaryRow}>
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
                  <p className={cashierPos.summaryRow}>
                    <span>{t("ticketDiscount")}</span>
                    <span className="tabular-nums">
                      {isPositiveDisplayMoney(
                        sheetMoney?.discount ?? appliedDiscount
                      )
                        ? `-${money(sheetMoney?.discount ?? appliedDiscount)}`
                        : money("0.00")}
                    </span>
                  </p>
                  <p className={cashierPos.summaryRow}>
                    <span>{t("paymentTax")}</span>
                    <span className="tabular-nums">
                      {money(
                        sheetMoney?.taxAmount ??
                          ticketMoney?.taxAmount ??
                          "0.00"
                      )}
                    </span>
                  </p>
                  <p className={cashierPos.totalRow}>
                    <span className={cashierPos.totalLabel}>
                      {t("ticketTotal")}
                    </span>
                    <span className={cashierPos.totalValue}>
                      {payAmountLabel}
                    </span>
                  </p>
                  {discountOpen && invoiceView.editable ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        className={cashierPos.moneyInput}
                        inputMode="decimal"
                        aria-label={t("discountAmount")}
                        placeholder={t("discountAmount")}
                        value={discountDraft}
                        onChange={(event) =>
                          setDiscountDraft(event.target.value)
                        }
                      />
                      <Button
                        type="button"
                        className="min-h-11"
                        onClick={() => {
                          const next = clampCashierDiscountAmount(
                            discountDraft,
                            ticketTotal
                          );
                          if (
                            cashierDiscountExceedsCatalogSubtotal(
                              discountDraft,
                              ticketTotal
                            )
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
                        className="min-h-11"
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
                      className="mt-1.5 min-h-9 w-full text-xs"
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
                  className={cn(cashierPos.primaryAction, "mt-2")}
                  disabled={
                    !terminalId ||
                    paymentOpen ||
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
                  {t("payWithAmount")} — {payAmountLabel}
                </Button>
                </div>
              </div>
            </section>

            {/* CENTER — wide Product Catalog */}
            <div className={cashierPos.catalog}>
              <div className={cashierPos.categoryBar}>
                {(() => {
                  const AllIcon = cashierAllCategoryIcon();
                  const tint = cashierAllCategoryTint();
                  return (
                    <button
                      type="button"
                      className={cn(
                        cashierPos.categoryTile,
                        categoryFilter === "all" ? tint.selected : tint.idle
                      )}
                      onClick={() => setCategoryFilter("all")}
                    >
                      <AllIcon className={cashierPos.categoryIcon} aria-hidden />
                      <span className={cashierPos.categoryLabel}>
                        {t("allCategories")}
                      </span>
                    </button>
                  );
                })()}
                {(() => {
                  const FavIcon = cashierFavoritesCategoryIcon();
                  const tint = cashierFavoritesCategoryTint();
                  return (
                    <button
                      type="button"
                      className={cn(
                        cashierPos.categoryTile,
                        categoryFilter === "favorites"
                          ? tint.selected
                          : tint.idle
                      )}
                      onClick={() => setCategoryFilter("favorites")}
                    >
                      <FavIcon className={cashierPos.categoryIcon} aria-hidden />
                      <span className={cashierPos.categoryLabel}>
                        {t("favorites")}
                      </span>
                    </button>
                  );
                })()}
                {categories.map((category) => {
                  const tint = resolveCashierCategoryTint(category);
                  const Icon = resolveCashierCategoryIcon(category);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={cn(
                        cashierPos.categoryTile,
                        categoryFilter === category.id
                          ? tint.selected
                          : tint.idle
                      )}
                      onClick={() => setCategoryFilter(category.id)}
                    >
                      <Icon className={cashierPos.categoryIcon} aria-hidden />
                      <span className={cashierPos.categoryLabel}>
                        {categoryLabel(
                          language,
                          category.nameAr,
                          category.nameEn,
                          t("unknownCategory")
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className={cashierPos.catalogScroll}>
                {catalogQuery.isPending ? (
                  <AppLoadingState label={t("loading")} />
                ) : visibleItems.length === 0 ? (
                  <AppEmptyState title={t("emptyCatalog")} />
                ) : (
                  <div className={cashierPos.productGrid}>
                    {visibleItems.map((item) => {
                      const itemName =
                        language === "ar"
                          ? item.nameAr
                          : item.nameEn ?? item.nameAr;
                      return (
                        <CashierProductCard
                          key={item.menuItemId}
                          item={{
                            menuItemId: item.menuItemId,
                            name: itemName,
                            price: item.price,
                            imageUrl: item.imageUrl,
                            isAvailable: item.isAvailable,
                          }}
                          currencyLabel={money}
                          availableLabel={t("available")}
                          unavailableLabel={t("unavailable")}
                          addLabel={t("addProduct")}
                          favorite={favoriteIdSet.has(item.menuItemId)}
                          flash={flashItemId === item.menuItemId}
                          disabled={salePhase === "payment" || Boolean(paidCheckout)}
                          onToggleFavorite={() => {
                            setFavoriteIds(
                              toggleCashierFavoriteId(
                                restaurantId,
                                item.menuItemId
                              )
                            );
                          }}
                          onAdd={() =>
                            addItem({
                              menuItemId: item.menuItemId,
                              nameAr: item.nameAr,
                              nameEn: item.nameEn,
                              price: item.price,
                            })
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile / tablet cart dock */}
          <div className={cashierPos.cartDock}>
            <button
              type="button"
              className={cashierPos.cartDockBtn}
              onClick={() => setSalePanelOpen(true)}
              aria-label={t("viewSale")}
            >
              <ShoppingCart className="size-5 shrink-0" aria-hidden />
              <span className={cashierPos.cartDockMeta}>
                <span className={cashierPos.cartDockTitle}>
                  {t("viewSale")}
                </span>
                <span className={cashierPos.cartDockSub}>
                  {invoiceView.lines.reduce(
                    (sum, line) => sum + line.quantity,
                    0
                  )}{" "}
                  {t("cartItemsCount")}
                  {displayOrderNumber ? ` · #${displayOrderNumber}` : ""}
                </span>
              </span>
              <span className={cashierPos.cartDockTotal}>{payAmountLabel}</span>
            </button>
          </div>

          {/* Payment modal — after PAY or Incoming Collect Invoice */}
          {paymentOpen ? (
            <div
              className={cashierPos.overlay}
              role="dialog"
              aria-modal="true"
              aria-label={t("paymentWorkspace")}
            >
              <div className={cashierPos.sheet} dir={dir}>
                <h2 className="text-lg font-semibold">
                  {t("completePaymentTitle")}
                </h2>
                {sheetMoney ? (
                  <div className="mt-4 space-y-1">
                    <p className="flex justify-between text-sm text-[#111827]">
                      <span>{t("ticketSubtotal")}</span>
                      <span className="tabular-nums">
                        {money(sheetMoney.subtotal)}
                      </span>
                    </p>
                    <p className="flex justify-between text-sm text-[#111827]">
                      <span>{t("ticketDiscount")}</span>
                      <span className="tabular-nums">
                        {isPositiveDisplayMoney(sheetMoney.discount)
                          ? `-${money(sheetMoney.discount)}`
                          : money("0.00")}
                      </span>
                    </p>
                    <p className="flex justify-between text-sm text-[#111827]">
                      <span>{t("paymentTax")}</span>
                      <span className="tabular-nums">
                        {money(sheetMoney.taxAmount)}
                      </span>
                    </p>
                  </div>
                ) : null}
                <p className="mt-4 text-sm font-medium text-[#111827]">
                  {t("amountDue")}
                </p>
                <p className={cashierPos.amountDueHuge}>
                  {amountDue
                    ? money(amountDue)
                    : sheetMoney
                      ? money(sheetMoney.grandTotal)
                      : money("0.00")}
                </p>
                {paying ? (
                  <p className="mt-1 text-xs text-[#111827]">{t("paying")}</p>
                ) : null}
                <p className="mb-2 mt-4 text-sm font-medium">
                  {t("choosePaymentMethod")}
                </p>
                <div className={cashierPos.methodGrid}>
                  {(
                    [
                      [
                        "cash",
                        "tenderCash",
                        Banknote,
                        cashierPos.methodBtnCash,
                        cashierPos.methodBtnCashActive,
                        cashierPos.methodWellCash,
                        cashierPos.methodWellCashActive,
                      ],
                      [
                        "network",
                        "tenderNetwork",
                        CreditCard,
                        cashierPos.methodBtnNetwork,
                        cashierPos.methodBtnNetworkActive,
                        cashierPos.methodWellNetwork,
                        cashierPos.methodWellNetworkActive,
                      ],
                      [
                        "mixed",
                        "tenderMixed",
                        Combine,
                        cashierPos.methodBtnMixed,
                        cashierPos.methodBtnMixedActive,
                        cashierPos.methodWellMixed,
                        cashierPos.methodWellMixedActive,
                      ],
                      [
                        "complimentary",
                        "tenderComplimentary",
                        Gift,
                        cashierPos.methodBtnGift,
                        cashierPos.methodBtnGiftActive,
                        cashierPos.methodWellGift,
                        cashierPos.methodWellGiftActive,
                      ],
                    ] as const
                  ).map(
                    ([
                      mode,
                      label,
                      Icon,
                      idleAccent,
                      activeAccent,
                      wellIdle,
                      wellActive,
                    ]) => {
                      const selected = tenderMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          className={cn(
                            selected
                              ? cashierPos.methodBtnActive
                              : cashierPos.methodBtn,
                            selected ? activeAccent : idleAccent
                          )}
                          onClick={() => {
                            setTenderMode(mode);
                            if (mode === "complimentary") {
                              setPaymentMethod("cash");
                              setCardTender("");
                              setCashReceived("");
                            } else if (mode === "cash") {
                              setPaymentMethod("cash");
                              setCardTender("");
                              setCashReceived(
                                amountDue ?? sheetMoney?.grandTotal ?? ""
                              );
                            } else if (mode === "network") {
                              setPaymentMethod("card");
                              setCashReceived("");
                              setCardTender(
                                amountDue ?? sheetMoney?.grandTotal ?? ""
                              );
                            } else {
                              setPaymentMethod("cash");
                              setCashReceived("");
                              setCardTender("");
                            }
                          }}
                        >
                          <span
                            className={cn(
                              cashierPos.methodIconWell,
                              selected ? wellActive : wellIdle
                            )}
                          >
                            <Icon
                              className={cashierPos.methodIcon}
                              aria-hidden
                            />
                          </span>
                          <span className={cashierPos.methodLabel}>
                            {t(label)}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
                {tenderMode === "complimentary" ? (
                  <p className="mt-3 text-sm text-[#111827]">
                    {t("complimentaryConfirmHint")}
                  </p>
                ) : null}
                {tenderMode === "cash" || tenderMode === "mixed" ? (
                  <div className="mt-3">
                    <label
                      className="text-sm font-medium"
                      htmlFor="cashier-tender-cash"
                    >
                      {tenderMode === "cash"
                        ? t("amountReceived")
                        : t("tenderCash")}
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
                    <label
                      className="text-sm font-medium"
                      htmlFor="cashier-tender-card"
                    >
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
                {tenderMode != null && tenderMode !== "complimentary" ? (
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
                    <span className="tabular-nums font-semibold">
                      {money(cashChange)}
                    </span>
                  </p>
                ) : null}
                {tenderMode !== "complimentary" &&
                tenderPlan &&
                tenderPlan.remainingCents > 0 ? (
                  <p className="mt-1 text-sm text-red-700">
                    {t("underpayment")}
                  </p>
                ) : null}
                {paymentReadiness.showCardOverTender ? (
                  <p className="mt-1 text-sm text-red-700">
                    {t("cardOverTender")}
                  </p>
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
                      paymentReadiness.confirmDisabled || tenderMode == null
                    }
                    onClick={() => void completePayment()}
                  >
                    {paying ? t("paying") : t("confirmPayment")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {paidCheckout ? (
            <div
              className={cashierPos.overlay}
              role="dialog"
              aria-modal="true"
              aria-label={t("paidWorkspaceTitle")}
            >
              <div className={cashierPos.sheet} dir={dir}>
                <div className={cashierPos.paidBox}>
                  <p className={cashierPos.paidStamp}>
                    ✓ {t("receiptPaidStamp")}
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    {money(paidCheckout.grandTotal)}
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    type="button"
                    className={cashierPos.primaryAction}
                    onClick={() => setPrintOpen(true)}
                    disabled={!paidReceipt}
                  >
                    {t("printInvoice")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={cashierPos.secondaryAction}
                    disabled
                  >
                    {t("sendInvoice")}
                  </Button>
                  <Button
                    type="button"
                    className={cashierPos.secondaryAction}
                    onClick={startNewSale}
                  >
                    {t("newSale")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </>
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
