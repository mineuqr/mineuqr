/**
 * PRINTING-RENDERING-1A — block-based ticket document structure.
 *
 * Blocks represent document structure only. No printer commands or byte encoding.
 */
import type { TicketDocumentKind } from "./ticketTypes";

export const TICKET_BLOCK_KIND = {
  HEADER: "header",
  IDENTITY: "identity",
  METADATA: "metadata",
  SECTION: "section",
  ITEM: "item",
  MODIFIER: "modifier",
  NOTE: "note",
  DIVIDER: "divider",
  TOTALS: "totals",
  FOOTER: "footer",
  IMAGE_PLACEHOLDER: "image-placeholder",
  QR_PLACEHOLDER: "qr-placeholder",
} as const;

export type TicketBlockKind = (typeof TICKET_BLOCK_KIND)[keyof typeof TICKET_BLOCK_KIND];

export type TicketMetadataField = {
  key: string;
  label: string;
  value: string;
};

export type TicketHeaderBlock = {
  kind: typeof TICKET_BLOCK_KIND.HEADER;
  title: string;
  subtitle?: string | null;
};

export type TicketIdentityBlock = {
  kind: typeof TICKET_BLOCK_KIND.IDENTITY;
  /** Primary display value — typically the order number. */
  displayValue: string;
};

export type TicketMetadataBlock = {
  kind: typeof TICKET_BLOCK_KIND.METADATA;
  fields: TicketMetadataField[];
};

export type TicketSectionBlock = {
  kind: typeof TICKET_BLOCK_KIND.SECTION;
  title?: string | null;
  blocks: TicketBlock[];
};

export type TicketItemBlock = {
  kind: typeof TICKET_BLOCK_KIND.ITEM;
  quantity: number;
  name: string;
  notes?: string | null;
  unitPrice?: string | null;
  modifiers: TicketModifierBlock[];
};

export type TicketModifierBlock = {
  kind: typeof TICKET_BLOCK_KIND.MODIFIER;
  name: string;
  quantity?: number | null;
};

export type TicketNoteBlock = {
  kind: typeof TICKET_BLOCK_KIND.NOTE;
  scope: "order" | "item";
  text: string;
};

export type TicketDividerBlock = {
  kind: typeof TICKET_BLOCK_KIND.DIVIDER;
};

export type TicketTotalsLine = {
  key: string;
  label: string;
  amount: string;
  currency?: string | null;
};

export type TicketTotalsBlock = {
  kind: typeof TICKET_BLOCK_KIND.TOTALS;
  lines: TicketTotalsLine[];
};

export type TicketFooterBlock = {
  kind: typeof TICKET_BLOCK_KIND.FOOTER;
  feedLines: number;
  cut: boolean;
};

export type TicketImagePlaceholderBlock = {
  kind: typeof TICKET_BLOCK_KIND.IMAGE_PLACEHOLDER;
  ref: string;
  alt?: string | null;
};

export type TicketQrPlaceholderBlock = {
  kind: typeof TICKET_BLOCK_KIND.QR_PLACEHOLDER;
  payload: string;
  label?: string | null;
};

export type TicketBlock =
  | TicketHeaderBlock
  | TicketIdentityBlock
  | TicketMetadataBlock
  | TicketSectionBlock
  | TicketItemBlock
  | TicketModifierBlock
  | TicketNoteBlock
  | TicketDividerBlock
  | TicketTotalsBlock
  | TicketFooterBlock
  | TicketImagePlaceholderBlock
  | TicketQrPlaceholderBlock;

export function isTicketItemBlock(block: TicketBlock): block is TicketItemBlock {
  return block.kind === TICKET_BLOCK_KIND.ITEM;
}

export function isTicketModifierBlock(block: TicketBlock): block is TicketModifierBlock {
  return block.kind === TICKET_BLOCK_KIND.MODIFIER;
}

export type TicketDocumentKindForBlocks = TicketDocumentKind;
