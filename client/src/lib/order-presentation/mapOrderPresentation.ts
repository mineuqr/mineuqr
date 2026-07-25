import type { KitchenTicketDto } from "@/lib/kitchen/types";
import type { KitchenColumnId } from "@/lib/kitchen/viewModels";
import {
  kitchenStatusPresentation,
  productDisplayName,
} from "@/lib/kitchen/kitchenPresentation";
import { explainDelay } from "@/lib/operational-workspace/delayIntelligence";
import {
  formatOperationalOrderHeading,
  operationalDisplayReference,
  type OperationalOrderIdentitySource,
} from "@/lib/operational-workspace/orderDisplayIdentity";
import {
  getOrderWorkspaceActions,
  type OperationalAction,
} from "@/lib/operational-workspace/operationalActions";
import {
  computeOrderCardSla,
  buildLinesSummaryFromItems,
} from "@/lib/operational-workspace/orderViewModels";
import {
  formatOperationalElapsedCompact,
  operationalCardElapsedClass,
} from "@/lib/operational-screen/operationalCardTypography";
import {
  formatOrderStatusLabel,
  type OrderLifecycleStatus,
} from "@/lib/orderStatusDisplay";
import {
  computeSlaSnapshot,
  formatElapsedLabel,
  type SlaSnapshot,
} from "@/lib/operational-workspace/slaEngine";
import { urgencyClassName } from "@/lib/kitchen/viewModels";
import { localizedProjectedFulfilmentLabel } from "./formatProjectedFulfilment";
import type {
  LocalizedLabel,
  OrderPresentationAction,
  OrderPresentationBadge,
  OrderPresentationIndicator,
  OrderPresentationLifecycle,
  OrderPresentationLineItem,
  OrderPresentationModel,
} from "./orderPresentationModel";
import { normalizeOrderLineModifiers } from "@shared/ordering-platform/orderLineModifiers";
import { presentationalNote } from "./presentationalNote";

type ActiveOrderLineItem = {
  lineItemId: number;
  quantity: number;
  nameAr: string;
  nameEn?: string | null;
  itemNotes?: string | null;
  /** Projected modifiers from Order Read / Kitchen DTO — optional on older sources. */
  modifiers?: readonly string[] | null;
};

export type ActiveOrderPresentationSource = OperationalOrderIdentitySource & {
  orderId: number;
  status: string;
  lifecycle: string;
  tableNumber: number;
  serviceMode: string;
  fulfilmentAnchorType: string;
  fulfilmentLabel: string;
  customerName: string | null;
  customerPhone?: string | null;
  notes: string | null;
  totalAmount: string;
  createdAt: string;
  lineItems: ActiveOrderLineItem[];
};

export type MapActiveOrderPresentationOptions = Readonly<{
  tableUnit?: "table" | "room";
  now?: Date;
  /**
   * SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 — override lifecycle actions
   * (e.g. sessionless Settle / cancel-after-paid gate).
   */
  availableActions?: OperationalAction[];
}>;

export type MapKitchenTicketPresentationOptions = Readonly<{
  now?: Date;
}>;

const LIFECYCLE_LABELS: Record<OrderPresentationLifecycle, LocalizedLabel> = {
  active: { en: "Active", ar: "نشط" },
  completed: { en: "Completed", ar: "مكتمل" },
  archived: { en: "Archived", ar: "مؤرشف" },
};

function localized(en: string, ar: string): LocalizedLabel {
  return { en, ar };
}

function resolveLifecycle(value: string): OrderPresentationLifecycle {
  if (value === "completed" || value === "archived") return value;
  return "active";
}

function buildItemSummary(
  items: ActiveOrderLineItem[],
  preferArabic: boolean
): string {
  return items
    .map((li) => {
      const name = preferArabic
        ? li.nameAr?.trim() || li.nameEn?.trim() || ""
        : li.nameEn?.trim() || li.nameAr?.trim() || "";
      return `${li.quantity}× ${name}`;
    })
    .join(", ");
}

function mapActions(actions: OperationalAction[]): OrderPresentationAction[] {
  return actions.map((action) => ({
    id: action.id,
    label: localized(action.labelEn, action.labelAr),
    variant: action.variant,
  }));
}

function mapTimingFromSla(
  sla: SlaSnapshot,
  columnElapsedMinutes: number,
  timingClass: string
): OrderPresentationModel["timing"] {
  const overdue = sla.status === "late" || sla.status === "critical";
  const indicatorTone =
    sla.status === "critical"
      ? "danger"
      : sla.status === "late"
        ? "warning"
        : sla.status === "at-risk"
          ? "warning"
          : "muted";

  return {
    elapsedSeconds: sla.elapsedSeconds,
    elapsedMinutes: Math.floor(sla.elapsedSeconds / 60),
    columnElapsedMinutes,
    targetSeconds: sla.targetSeconds,
    lateSeconds: sla.lateSeconds,
    overdue,
    priority: sla.urgencyTier,
    slaStatus: sla.status,
    urgencyTier: sla.urgencyTier,
    elapsedLabel: localized(
      formatElapsedLabel(sla.elapsedSeconds, false),
      formatElapsedLabel(sla.elapsedSeconds, true)
    ),
    elapsedCompactLabel: localized(
      formatOperationalElapsedCompact(columnElapsedMinutes, false),
      formatOperationalElapsedCompact(columnElapsedMinutes, true)
    ),
    targetLabel: localized(
      formatElapsedLabel(sla.targetSeconds, false),
      formatElapsedLabel(sla.targetSeconds, true)
    ),
    lateLabel:
      sla.lateSeconds > 0
        ? localized(
            formatElapsedLabel(sla.lateSeconds, false),
            formatElapsedLabel(sla.lateSeconds, true)
          )
        : null,
    indicatorTone,
    elapsedClassName: operationalCardElapsedClass(sla, timingClass),
  };
}

function mapDelay(
  status: string,
  sla: SlaSnapshot,
  printingFailed?: boolean
): OrderPresentationModel["delay"] {
  const delayEn = explainDelay({ status, sla, printingFailed, isAr: false });
  const delayAr = explainDelay({ status, sla, printingFailed, isAr: true });
  const showWarning =
    sla.status === "late" || sla.status === "critical" || sla.status === "at-risk";

  return {
    reason: delayEn.reason,
    message: localized(delayEn.message, delayAr.message),
    showWarning,
    warningTone:
      sla.status === "critical" ? "destructive" : showWarning ? "amber" : null,
  };
}

function mapLineItems(items: ActiveOrderLineItem[]): OrderPresentationLineItem[] {
  return items.map((line) => ({
    lineItemId: line.lineItemId,
    quantityLabel: String(line.quantity),
    nameEn: line.nameEn?.trim() || line.nameAr?.trim() || "",
    nameAr: line.nameAr?.trim() || line.nameEn?.trim() || "",
    itemNotes: presentationalNote(line.itemNotes),
    modifiers: normalizeOrderLineModifiers(line.modifiers),
  }));
}

function buildPresentationCore(input: {
  orderId: number;
  identitySource: OperationalOrderIdentitySource & { businessDay?: string | null };
  lifecycle: string;
  status: string;
  tableNumber: number;
  serviceMode: string;
  fulfilmentAnchorType: string;
  fulfilmentLabel: string;
  fulfillmentLabel: LocalizedLabel;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  totalAmount: string | null;
  lineItems: ActiveOrderLineItem[];
  sla: SlaSnapshot;
  columnElapsedMinutes: number;
  timingClass: string;
  availableActions: OperationalAction[];
  kitchenStatus?: KitchenColumnId;
}): OrderPresentationModel {
  const lifecycle = resolveLifecycle(input.lifecycle);
  const status = input.status as OrderLifecycleStatus;
  const statusPresentation = input.kitchenStatus
    ? kitchenStatusPresentation(input.kitchenStatus)
    : null;

  const delay = mapDelay(input.status, input.sla);
  const badges: OrderPresentationBadge[] = [];
  if (input.sla.status === "late" || input.sla.status === "critical") {
    badges.push({
      id: "sla-overdue",
      label: localized("Overdue", "متأخر"),
      tone: input.sla.status === "critical" ? "danger" : "warning",
    });
  }

  const indicators: OrderPresentationIndicator[] = [];
  if (delay.showWarning) {
    indicators.push({
      id: "delay-warning",
      visible: true,
      message: delay.message,
      tone: delay.warningTone === "destructive" ? "danger" : "warning",
    });
  }

  const displayNumber = operationalDisplayReference(input.identitySource);
  const displayReference = formatOperationalOrderHeading(input.identitySource);
  const businessIdentityLabel = localized(displayReference, displayReference);

  return {
    orderId: input.orderId,
    identity: {
      displayNumber,
      displayReference,
      businessDay: input.identitySource.businessDay ?? null,
      businessIdentityLabel,
    },
    lifecycle,
    lifecycleLabel: LIFECYCLE_LABELS[lifecycle],
    status: input.status,
    statusLabel: localized(
      formatOrderStatusLabel(status, "en"),
      formatOrderStatusLabel(status, "ar")
    ),
    timing: mapTimingFromSla(input.sla, input.columnElapsedMinutes, input.timingClass),
    customer: {
      name: input.customerName,
      summary: input.customerPhone ?? null,
    },
    fulfillment: {
      tableNumber: input.tableNumber,
      serviceMode: input.serviceMode,
      fulfilmentAnchorType: input.fulfilmentAnchorType,
      fulfilmentLabel: input.fulfilmentLabel,
      label: input.fulfillmentLabel,
    },
    items: {
      summary: localized(
        buildItemSummary(input.lineItems, false) || buildLinesSummaryFromItems(input.lineItems),
        buildItemSummary(input.lineItems, true) || buildLinesSummaryFromItems(input.lineItems)
      ),
      count: input.lineItems.length,
      lines: mapLineItems(input.lineItems),
    },
    notes: presentationalNote(input.notes),
    totalAmount: input.totalAmount,
    badges,
    indicators,
    delay,
    emphasis: input.kitchenStatus
      ? {
          cardBorderClass: urgencyClassName(input.sla.urgencyTier),
          statusAccentClass: statusPresentation!.accentClass,
          statusLabelClass: statusPresentation!.labelClass,
          actionButtonClass: statusPresentation!.actionButtonClass,
        }
      : {
          cardBorderClass:
            input.sla.urgencyTier === "critical"
              ? "border-destructive/50 bg-destructive/5"
              : input.sla.urgencyTier === "elevated"
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-border bg-card",
          statusAccentClass: "",
          statusLabelClass: "",
          actionButtonClass: "",
        },
    availableActions: mapActions(input.availableActions),
  };
}

/** Maps an active-order read DTO into the canonical presentation contract. */
export function mapActiveOrderPresentation(
  source: ActiveOrderPresentationSource,
  options: MapActiveOrderPresentationOptions = {}
): OrderPresentationModel {
  const tableUnit = options.tableUnit ?? "table";
  const sla = computeOrderCardSla(source.status, source.createdAt, options.now);
  const columnElapsedMinutes = Math.floor(sla.elapsedSeconds / 60);

  const fulfilmentSource = {
    serviceMode: source.serviceMode,
    fulfilmentAnchorType: source.fulfilmentAnchorType,
    fulfilmentLabel: source.fulfilmentLabel,
  };

  return buildPresentationCore({
    orderId: source.orderId,
    identitySource: source,
    lifecycle: source.lifecycle,
    status: source.status,
    tableNumber: source.tableNumber,
    serviceMode: source.serviceMode,
    fulfilmentAnchorType: source.fulfilmentAnchorType,
    fulfilmentLabel: source.fulfilmentLabel,
    fulfillmentLabel: localizedProjectedFulfilmentLabel(fulfilmentSource, tableUnit),
    customerName: source.customerName,
    customerPhone: source.customerPhone ?? null,
    notes: source.notes,
    totalAmount: source.totalAmount,
    lineItems: source.lineItems,
    sla,
    columnElapsedMinutes,
    timingClass: "text-sm font-bold tabular-nums leading-none text-foreground",
    availableActions:
      options.availableActions ??
      getOrderWorkspaceActions(source.status as OrderLifecycleStatus),
  });
}

/** Maps a kitchen ticket read DTO into the canonical presentation contract. */
export function mapKitchenTicketPresentation(
  ticket: KitchenTicketDto,
  options: MapKitchenTicketPresentationOptions = {}
): OrderPresentationModel {
  const sla = computeSlaSnapshot(
    ticket.status,
    ticket.columnElapsedSeconds,
    ticket.elapsedSeconds
  );
  const columnElapsedMinutes = Math.max(0, Math.floor(ticket.columnElapsedSeconds / 60));
  const kitchenStatus = ticket.status as KitchenColumnId;

  const kitchenActions: OperationalAction[] = [];
  if (ticket.status === "pending") {
    kitchenActions.push({
      id: "start-preparing",
      targetStatus: "preparing",
      labelEn: "Start Preparing",
      labelAr: "بدء التحضير",
      variant: "primary",
    });
  } else if (ticket.status === "ready") {
    kitchenActions.push({
      id: "serve-order",
      targetStatus: "served",
      labelEn: "Serve Order",
      labelAr: "تقديم الطلب",
      variant: "primary",
    });
  }

  const lineItems: ActiveOrderLineItem[] = ticket.lineItems.map((line) => ({
    lineItemId: line.lineItemId,
    quantity: line.quantity,
    nameAr: line.nameAr,
    nameEn: line.nameEn,
    itemNotes: line.itemNotes,
    modifiers: line.modifiers,
  }));

  const fulfilmentSource = {
    serviceMode: ticket.serviceMode,
    fulfilmentAnchorType: ticket.fulfilmentAnchorType,
    fulfilmentLabel: ticket.fulfilmentLabel,
  };

  const presentation = buildPresentationCore({
    orderId: ticket.orderId,
    identitySource: ticket,
    lifecycle: "active",
    status: ticket.status,
    tableNumber: ticket.tableNumber,
    serviceMode: ticket.serviceMode,
    fulfilmentAnchorType: ticket.fulfilmentAnchorType,
    fulfilmentLabel: ticket.fulfilmentLabel,
    fulfillmentLabel: localizedProjectedFulfilmentLabel(fulfilmentSource, "table"),
    customerName: ticket.customerName,
    customerPhone: null,
    notes: ticket.orderNotes,
    totalAmount: null,
    lineItems,
    sla,
    columnElapsedMinutes,
    timingClass: "text-sm font-bold tabular-nums leading-none text-foreground",
    availableActions: kitchenActions,
    kitchenStatus,
  });

  const statusPresentation = kitchenStatusPresentation(kitchenStatus);

  return {
    ...presentation,
    items: {
      ...presentation.items,
      summary: localized(ticket.linesSummary, ticket.linesSummary),
      lines: ticket.lineItems.map((line) => ({
        lineItemId: line.lineItemId,
        quantityLabel: String(line.quantity),
        nameEn: productDisplayName(line, false),
        nameAr: productDisplayName(line, true),
        itemNotes: presentationalNote(line.itemNotes),
        modifiers: normalizeOrderLineModifiers(line.modifiers),
      })),
    },
    emphasis: {
      cardBorderClass: urgencyClassName(ticket.urgencyTier),
      statusAccentClass: statusPresentation.accentClass,
      statusLabelClass: statusPresentation.labelClass,
      actionButtonClass: statusPresentation.actionButtonClass,
    },
  };
}
