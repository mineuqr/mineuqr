/**
 * PRINTING-RENDERING-1B — TicketDocument layout engine (platform-neutral).
 *
 * Converts TicketDocument blocks + rendering policy into a layout plan.
 * No ESC/POS, transport, or business logic.
 */
import {
  buildSeparatorLine,
  resolveReceiptLayoutProfile,
  type ReceiptLayoutProfile,
  type ReceiptLayoutProfileId,
} from "../../receipts/layoutProfiles";
import { getReceiptLabels } from "../../receipts/receiptLabels";
import { TICKET_BLOCK_KIND } from "../ticketBlocks";
import type { TicketBlock } from "../ticketBlocks";
import { TICKET_DOCUMENT_KIND, type TicketDocument } from "../ticketTypes";
import {
  resolveTicketRenderingPolicy,
  type TicketRenderingPolicy,
  type TicketRenderingPolicyId,
} from "./renderingPolicy";
import { indentText, padColumn, wrapTextToWidth } from "./textWrapping";
import { formatOrderIdentityLine, TEXT_TYPOGRAPHY } from "./typography";
import type { TicketLayoutLine, TicketLayoutPlan } from "./ticketLayoutTypes";

export type BuildTicketLayoutPlanInput = {
  document: TicketDocument;
  policyId?: TicketRenderingPolicyId;
  layoutProfileId?: ReceiptLayoutProfileId;
};

function appendLine(
  lines: TicketLayoutLine[],
  input: Omit<TicketLayoutLine, "textDirection"> & { textDirection?: TicketLayoutLine["textDirection"] },
  document: TicketDocument
): void {
  lines.push({
    textDirection: document.defaultTextDirection,
    ...input,
  });
}

function appendDivider(lines: TicketLayoutLine[], profile: ReceiptLayoutProfile, document: TicketDocument): void {
  appendLine(lines, {
    text: buildSeparatorLine(profile),
    alignment: "left",
    typography: TEXT_TYPOGRAPHY.NORMAL,
    isSeparator: true,
  }, document);
}

function shouldRenderMetadataField(
  key: string,
  policy: TicketRenderingPolicy
): boolean {
  switch (key) {
    case "orderNumber":
      return policy.showOrderNumberMetadata;
    case "tableNumber":
      return policy.showTable;
    case "sessionId":
      return policy.showSession;
    case "createdAt":
      return policy.showTime;
    case "station":
      return policy.showStation;
    case "serviceType":
      return policy.showServiceType;
    default:
      return true;
  }
}

function formatItemQuantity(quantity: number): string {
  return `${quantity}x`;
}

function formatItemLine(quantity: number, name: string): string {
  return `${quantity}x ${name}`;
}

function renderItemBlock(
  lines: TicketLayoutLine[],
  block: Extract<TicketBlock, { kind: typeof TICKET_BLOCK_KIND.ITEM }>,
  profile: ReceiptLayoutProfile,
  policy: TicketRenderingPolicy,
  document: TicketDocument
): void {
  if (document.kind === TICKET_DOCUMENT_KIND.DIAGNOSTIC) {
    const printableName = block.name === "\u200B" ? "" : block.name;
    appendLine(lines, {
      text: formatItemLine(block.quantity, printableName),
      alignment: "left",
      typography: TEXT_TYPOGRAPHY.NORMAL,
    }, document);
    return;
  }

  const quantityText = formatItemQuantity(block.quantity);
  const quantityColumn = padColumn(quantityText, profile.quantityColumnWidth);
  const nameWidth = Math.max(
    1,
    profile.charactersPerLine - profile.quantityColumnWidth - 1
  );

  const nameLines = policy.wrapItemNames
    ? wrapTextToWidth(block.name, nameWidth)
    : [block.name];

  appendLine(lines, {
    text: `${quantityColumn} ${nameLines[0] ?? ""}`.trimEnd(),
    alignment: "left",
    typography: TEXT_TYPOGRAPHY.ITEM_NAME,
  }, document);

  for (const continuation of nameLines.slice(1)) {
    appendLine(lines, {
      text: indentText(continuation, profile.quantityColumnWidth + 1),
      alignment: "left",
      typography: TEXT_TYPOGRAPHY.ITEM_NAME,
      indentColumns: profile.quantityColumnWidth + 1,
    }, document);
  }

  if (policy.showPrices && block.unitPrice) {
    appendLine(lines, {
      text: indentText(block.unitPrice, profile.quantityColumnWidth + 1),
      alignment: "right",
      typography: TEXT_TYPOGRAPHY.METADATA,
      indentColumns: profile.quantityColumnWidth + 1,
    }, document);
  }

  for (const modifier of block.modifiers) {
    const modifierQty =
      modifier.quantity != null && modifier.quantity > 1 ? ` ${modifier.quantity}x` : "";
    appendLine(lines, {
      text: indentText(`+ ${modifier.name}${modifierQty}`, 2),
      alignment: "left",
      typography: TEXT_TYPOGRAPHY.MODIFIER,
      indentColumns: 2,
    }, document);
  }

  if (block.notes?.trim()) {
    appendLine(lines, {
      text: indentText(`* ${block.notes.trim()}`, 2),
      alignment: "left",
      typography: TEXT_TYPOGRAPHY.NOTE,
      indentColumns: 2,
    }, document);
  }
}

function renderTotalsBlock(
  lines: TicketLayoutLine[],
  block: Extract<TicketBlock, { kind: typeof TICKET_BLOCK_KIND.TOTALS }>,
  profile: ReceiptLayoutProfile,
  document: TicketDocument
): void {
  appendDivider(lines, profile, document);

  for (const line of block.lines) {
    const currencySuffix = line.currency ? ` ${line.currency}` : "";
    appendLine(lines, {
      text: `${line.label}: ${line.amount}${currencySuffix}`,
      alignment: "right",
      typography:
        line.key === "total" ? TEXT_TYPOGRAPHY.TOTAL_AMOUNT : TEXT_TYPOGRAPHY.TOTAL_LABEL,
    }, document);
  }
}

function renderIdentity(
  lines: TicketLayoutLine[],
  document: TicketDocument,
  policy: TicketRenderingPolicy
): void {
  if (document.kind === TICKET_DOCUMENT_KIND.DIAGNOSTIC) {
    const labels = getReceiptLabels(document.locale);
    appendLine(lines, {
      text: labels.kitchenOrderTitle,
      alignment: "center",
      typography: TEXT_TYPOGRAPHY.NORMAL,
    }, document);
    return;
  }

  const identityBlock = document.blocks.find(
    (block) => block.kind === TICKET_BLOCK_KIND.IDENTITY
  );
  const rawValue = identityBlock?.kind === TICKET_BLOCK_KIND.IDENTITY
    ? identityBlock.displayValue
    : document.identity.orderNumber;

  const identityText = policy.identityUsesOrderPrefix
    ? formatOrderIdentityLine(rawValue)
    : rawValue;

  appendLine(lines, {
    text: identityText,
    alignment: "center",
    typography: TEXT_TYPOGRAPHY.IDENTITY,
  }, document);
}

function walkBlocks(
  lines: TicketLayoutLine[],
  blocks: TicketBlock[],
  profile: ReceiptLayoutProfile,
  policy: TicketRenderingPolicy,
  document: TicketDocument
): void {
  for (const block of blocks) {
    switch (block.kind) {
      case TICKET_BLOCK_KIND.IDENTITY:
        break;
      case TICKET_BLOCK_KIND.HEADER:
        if (block.title.trim()) {
          appendLine(lines, {
            text: block.title,
            alignment: "center",
            typography: TEXT_TYPOGRAPHY.EMPHASIS,
          }, document);
        }
        if (block.subtitle?.trim()) {
          appendLine(lines, {
            text: block.subtitle.trim(),
            alignment: "center",
            typography: TEXT_TYPOGRAPHY.METADATA,
          }, document);
        }
        break;
      case TICKET_BLOCK_KIND.METADATA:
        for (const field of block.fields) {
          if (!shouldRenderMetadataField(field.key, policy)) {
            continue;
          }
          appendLine(lines, {
            text: `${field.label}: ${field.value}`,
            alignment: "left",
            typography: TEXT_TYPOGRAPHY.METADATA,
          }, document);
        }
        break;
      case TICKET_BLOCK_KIND.DIVIDER:
        appendDivider(lines, profile, document);
        break;
      case TICKET_BLOCK_KIND.ITEM:
        renderItemBlock(lines, block, profile, policy, document);
        break;
      case TICKET_BLOCK_KIND.NOTE:
        if (block.scope === "order") {
          appendDivider(lines, profile, document);
          appendLine(lines, {
            text: getReceiptLabels(document.locale).orderNotes,
            alignment: "left",
            typography: TEXT_TYPOGRAPHY.EMPHASIS,
          }, document);
          appendLine(lines, {
            text: block.text,
            alignment: "left",
            typography: TEXT_TYPOGRAPHY.NOTE,
          }, document);
        }
        break;
      case TICKET_BLOCK_KIND.TOTALS:
        if (policy.showTotals) {
          renderTotalsBlock(lines, block, profile, document);
        }
        break;
      case TICKET_BLOCK_KIND.SECTION:
        if (block.title?.trim()) {
          appendLine(lines, {
            text: block.title.trim(),
            alignment: "left",
            typography: TEXT_TYPOGRAPHY.EMPHASIS,
          }, document);
        }
        walkBlocks(lines, block.blocks, profile, policy, document);
        break;
      case TICKET_BLOCK_KIND.FOOTER:
        break;
      case TICKET_BLOCK_KIND.IMAGE_PLACEHOLDER:
      case TICKET_BLOCK_KIND.QR_PLACEHOLDER:
        break;
      default:
        break;
    }
  }
}

export function buildTicketLayoutPlan(input: BuildTicketLayoutPlanInput): TicketLayoutPlan {
  const policy = resolveTicketRenderingPolicy({
    document: input.document,
    policyId: input.policyId,
  });
  const profile = resolveReceiptLayoutProfile({
    paperWidthMm: input.document.renderHints?.paperWidthMm,
    profileId: input.layoutProfileId,
  });

  const lines: TicketLayoutLine[] = [];
  renderIdentity(lines, input.document, policy);
  walkBlocks(lines, input.document.blocks, profile, policy, input.document);

  if (!lines.some((line) => line.isSeparator)) {
    appendDivider(lines, profile, input.document);
  }

  return {
    document: input.document,
    profile,
    policy,
    lines,
    feedLines: input.document.footer.feedLines,
    cut: input.document.footer.cut,
  };
}
