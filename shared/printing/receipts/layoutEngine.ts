/**
 * THERMAL-PRINTING-13B — width-aware layout engine (platform-neutral render plan).
 */
import { getReceiptLabels } from "./receiptLabels";
import {
  buildSeparatorLine,
  type ReceiptLayoutProfile,
} from "./layoutProfiles";
import type { TextDirection } from "./receiptLocale";
import type { Receipt } from "./receiptTypes";

export type ReceiptLineAlignment = "left" | "center" | "right";

export type ReceiptRenderLine = {
  text: string;
  alignment: ReceiptLineAlignment;
  textDirection: TextDirection;
};

export type ReceiptRenderSeparator = {
  kind: "separator";
  line: string;
};

export type ReceiptRenderBlock =
  | { kind: "line"; line: ReceiptRenderLine }
  | ReceiptRenderSeparator;

export type ReceiptRenderPlan = {
  receipt: Receipt;
  profile: ReceiptLayoutProfile;
  blocks: ReceiptRenderBlock[];
  feedLines: number;
  cut: boolean;
};

function formatCreatedAt(createdAt: Date): string {
  return createdAt.toISOString();
}

function formatItemLine(quantity: number, name: string): string {
  return `${quantity}x ${name}`;
}

function formatItemNote(prefix: string, notes: string): string {
  return `${prefix} ${notes}`;
}

function appendMetadataLines(
  blocks: ReceiptRenderBlock[],
  receipt: Receipt,
  labels: ReturnType<typeof getReceiptLabels>,
  textDirection: TextDirection
): void {
  blocks.push({
    kind: "line",
    line: {
      text: `${labels.orderNumber}: ${receipt.metadata.orderNumber}`,
      alignment: "left",
      textDirection,
    },
  });

  if (receipt.metadata.tableNumber != null) {
    blocks.push({
      kind: "line",
      line: {
        text: `${labels.tableNumber}: ${receipt.metadata.tableNumber}`,
        alignment: "left",
        textDirection,
      },
    });
  }

  if (receipt.metadata.sessionId != null) {
    blocks.push({
      kind: "line",
      line: {
        text: `${labels.sessionId}: ${receipt.metadata.sessionId}`,
        alignment: "left",
        textDirection,
      },
    });
  }

  blocks.push({
    kind: "line",
    line: {
      text: `${labels.createdTime}: ${formatCreatedAt(receipt.metadata.createdAt)}`,
      alignment: "left",
      textDirection,
    },
  });
}

function appendItemBlocks(
  blocks: ReceiptRenderBlock[],
  receipt: Receipt,
  labels: ReturnType<typeof getReceiptLabels>,
  textDirection: TextDirection
): void {
  for (const item of receipt.items) {
    blocks.push({
      kind: "line",
      line: {
        text: formatItemLine(item.quantity, item.name),
        alignment: "left",
        textDirection,
      },
    });

    if (item.notes) {
      blocks.push({
        kind: "line",
        line: {
          text: formatItemNote(labels.itemNotePrefix, item.notes),
          alignment: "left",
          textDirection,
        },
      });
    }
  }
}

function appendOrderNotes(
  blocks: ReceiptRenderBlock[],
  receipt: Receipt,
  labels: ReturnType<typeof getReceiptLabels>,
  profile: ReceiptLayoutProfile,
  textDirection: TextDirection
): void {
  const orderNotes = receipt.notes?.orderNotes?.trim();
  if (!orderNotes) {
    return;
  }

  blocks.push({
    kind: "separator",
    line: buildSeparatorLine(profile),
  });
  blocks.push({
    kind: "line",
    line: {
      text: labels.orderNotes,
      alignment: "left",
      textDirection,
    },
  });
  blocks.push({
    kind: "line",
    line: {
      text: orderNotes,
      alignment: "left",
      textDirection,
    },
  });
}

function appendTotals(
  blocks: ReceiptRenderBlock[],
  receipt: Receipt,
  labels: ReturnType<typeof getReceiptLabels>,
  profile: ReceiptLayoutProfile,
  textDirection: TextDirection
): void {
  const totals = receipt.totals;
  if (!totals?.subtotal && !totals?.total) {
    return;
  }

  blocks.push({
    kind: "separator",
    line: buildSeparatorLine(profile),
  });

  const currencySuffix = totals.currency ? ` ${totals.currency}` : "";

  if (totals.subtotal) {
    blocks.push({
      kind: "line",
      line: {
        text: `${labels.subtotal}: ${totals.subtotal}${currencySuffix}`,
        alignment: "right",
        textDirection,
      },
    });
  }

  if (totals.total) {
    blocks.push({
      kind: "line",
      line: {
        text: `${labels.total}: ${totals.total}${currencySuffix}`,
        alignment: "right",
        textDirection,
      },
    });
  }
}

export function buildReceiptRenderPlan(
  receipt: Receipt,
  profile: ReceiptLayoutProfile
): ReceiptRenderPlan {
  const labels = getReceiptLabels(receipt.locale);
  const textDirection = receipt.defaultTextDirection;
  const blocks: ReceiptRenderBlock[] = [];

  blocks.push({
    kind: "line",
    line: {
      text: receipt.header.title || labels.kitchenOrderTitle,
      alignment: "center",
      textDirection,
    },
  });

  appendMetadataLines(blocks, receipt, labels, textDirection);

  blocks.push({
    kind: "separator",
    line: buildSeparatorLine(profile),
  });

  appendItemBlocks(blocks, receipt, labels, textDirection);
  appendOrderNotes(blocks, receipt, labels, profile, textDirection);
  appendTotals(blocks, receipt, labels, profile, textDirection);

  blocks.push({
    kind: "separator",
    line: buildSeparatorLine(profile),
  });

  return {
    receipt,
    profile,
    blocks,
    feedLines: receipt.footer.feedLines,
    cut: receipt.footer.cut,
  };
}
