/**
 * PRINTING-RENDERING-1A — Ticket Builder (business mapping → TicketDocument).
 *
 * Contains business mapping only. No ESC/POS, transport, or device logic.
 */
import { PRINT_TICKET_LOCALE } from "../types";
import { resolveReceiptDirectionProfile } from "../receipts/receiptLocale";
import { TICKET_BLOCK_KIND } from "./ticketBlocks";
import type { TicketBlock } from "./ticketBlocks";
import { getTicketMetadataLabels } from "./ticketLabels";
import {
  TICKET_DOCUMENT_KIND,
  TICKET_DOCUMENT_SCHEMA_VERSION,
  type TicketDocument,
  type TicketDocumentKind,
} from "./ticketTypes";

export type KitchenOrderTicketItemInput = {
  itemName: string;
  quantity: number;
  notes: string | null;
  modifiers?: Array<{
    name: string;
    quantity?: number | null;
  }>;
};

export type BuildKitchenOrderTicketDocumentInput = {
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  tableNumber: string | null;
  sessionId: number | null;
  createdAt: Date;
  orderNotes: string | null;
  items: KitchenOrderTicketItemInput[];
  execution: {
    stationId: number | null;
    stationName: string | null;
  };
  locale?: TicketDocument["locale"];
  kind?: Extract<TicketDocumentKind, "kitchen-order" | "diagnostic">;
};

function formatCreatedAt(createdAt: Date): string {
  return createdAt.toISOString();
}

function buildMetadataFields(
  input: BuildKitchenOrderTicketDocumentInput,
  labels: ReturnType<typeof getTicketMetadataLabels>
): TicketBlock[] {
  const blocks: TicketBlock[] = [];

  blocks.push({
    kind: TICKET_BLOCK_KIND.METADATA,
    fields: [
      {
        key: "orderNumber",
        label: "Order Number",
        value: input.orderNumber,
      },
    ],
  });

  if (input.tableNumber != null) {
    blocks.push({
      kind: TICKET_BLOCK_KIND.METADATA,
      fields: [
        {
          key: "tableNumber",
          label: labels.tableNumber,
          value: input.tableNumber,
        },
      ],
    });
  }

  if (input.sessionId != null) {
    blocks.push({
      kind: TICKET_BLOCK_KIND.METADATA,
      fields: [
        {
          key: "sessionId",
          label: labels.sessionId,
          value: String(input.sessionId),
        },
      ],
    });
  }

  blocks.push({
    kind: TICKET_BLOCK_KIND.METADATA,
    fields: [
      {
        key: "createdAt",
        label: labels.createdTime,
        value: formatCreatedAt(input.createdAt),
      },
    ],
  });

  if (input.execution.stationName) {
    blocks.push({
      kind: TICKET_BLOCK_KIND.METADATA,
      fields: [
        {
          key: "station",
          label: labels.station,
          value: input.execution.stationName,
        },
      ],
    });
  }

  return blocks;
}

function buildItemBlocks(items: KitchenOrderTicketItemInput[]): TicketBlock[] {
  const blocks: TicketBlock[] = [];

  for (const item of items) {
    blocks.push({
      kind: TICKET_BLOCK_KIND.ITEM,
      quantity: item.quantity,
      name: item.itemName,
      notes: item.notes,
      modifiers: (item.modifiers ?? []).map((modifier) => ({
        kind: TICKET_BLOCK_KIND.MODIFIER,
        name: modifier.name,
        quantity: modifier.quantity ?? null,
      })),
    });
  }

  return blocks;
}

export function buildKitchenOrderTicketDocument(
  input: BuildKitchenOrderTicketDocumentInput
): TicketDocument {
  const locale = input.locale ?? PRINT_TICKET_LOCALE.EN;
  const directions = resolveReceiptDirectionProfile(locale);
  const labels = getTicketMetadataLabels(locale);
  const kind = input.kind ?? TICKET_DOCUMENT_KIND.KITCHEN_ORDER;

  const blocks: TicketBlock[] = [
    {
      kind: TICKET_BLOCK_KIND.IDENTITY,
      displayValue: input.orderNumber,
    },
    ...buildMetadataFields(input, labels),
    { kind: TICKET_BLOCK_KIND.DIVIDER },
    ...buildItemBlocks(input.items),
  ];

  const trimmedNotes = input.orderNotes?.trim();
  if (trimmedNotes) {
    blocks.push({
      kind: TICKET_BLOCK_KIND.NOTE,
      scope: "order",
      text: trimmedNotes,
    });
  }

  blocks.push({ kind: TICKET_BLOCK_KIND.DIVIDER });

  return {
    schemaVersion: TICKET_DOCUMENT_SCHEMA_VERSION,
    kind,
    locale,
    layoutDirection: directions.layoutDirection,
    defaultTextDirection: directions.defaultTextDirection,
    restaurantId: input.restaurantId,
    identity: {
      orderNumber: input.orderNumber,
      orderId: input.orderId,
    },
    execution: {
      stationId: input.execution.stationId,
      stationName: input.execution.stationName,
    },
    blocks,
    footer: {
      feedLines: 3,
      cut: true,
    },
  };
}

export type BuildDiagnosticTicketDocumentInput = {
  restaurantId: number;
  orderId: number;
  lines: string[];
};

/**
 * Diagnostic tickets preserve line-oriented content via item blocks.
 * Identity uses a fixed diagnostic label; execution metadata is empty.
 */
export function buildDiagnosticTicketDocument(
  input: BuildDiagnosticTicketDocumentInput
): TicketDocument {
  const locale = PRINT_TICKET_LOCALE.EN;
  const directions = resolveReceiptDirectionProfile(locale);

  return {
    schemaVersion: TICKET_DOCUMENT_SCHEMA_VERSION,
    kind: TICKET_DOCUMENT_KIND.DIAGNOSTIC,
    locale,
    layoutDirection: directions.layoutDirection,
    defaultTextDirection: directions.defaultTextDirection,
    restaurantId: input.restaurantId,
    identity: {
      orderNumber: String(input.orderId),
      orderId: input.orderId,
    },
    execution: {
      stationId: null,
      stationName: null,
    },
    blocks: [
      {
        kind: TICKET_BLOCK_KIND.IDENTITY,
        displayValue: String(input.orderId),
      },
      {
        kind: TICKET_BLOCK_KIND.METADATA,
        fields: [
          {
            key: "orderNumber",
            label: "Order Number",
            value: String(input.orderId),
          },
        ],
      },
      { kind: TICKET_BLOCK_KIND.DIVIDER },
      ...input.lines.map((line) => ({
        kind: TICKET_BLOCK_KIND.ITEM as const,
        quantity: 1,
        name: line.length > 0 ? line : "\u200B",
        notes: null as string | null,
        modifiers: [],
      })),
      { kind: TICKET_BLOCK_KIND.DIVIDER },
    ],
    footer: {
      feedLines: 3,
      cut: true,
    },
  };
}
