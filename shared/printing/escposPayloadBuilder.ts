/**
 * THERMAL-PRINTING-10A — ESC/POS payload generation from agent ticket data (no device I/O).
 */
import type { AgentJobTicketPayload } from "./agentJobMessages";
import { ESC_POS_PAYLOAD_KIND, type EscPosPayload } from "./executionExecutor";

const DEFAULT_SEPARATOR_LENGTH = 32;

const ESC_POS_BYTES = {
  ESC: 0x1b,
  GS: 0x1d,
  LF: 0x0a,
  INIT: 0x40,
  ALIGN: 0x61,
  FEED: 0x64,
  CUT: 0x56,
} as const;

const ESC_POS_ALIGN_VALUE = {
  left: 0x00,
  center: 0x01,
  right: 0x02,
} as const;

const ESC_POS_CUT_PARTIAL = 0x00;

type EscPosAlign = "left" | "center" | "right";

type EscPosCommand =
  | { type: "initialize" }
  | { type: "text"; value: string }
  | { type: "align"; value: EscPosAlign }
  | { type: "separator" }
  | { type: "feed"; lines: number }
  | { type: "cut" };

const textEncoder = new TextEncoder();

class EscPosByteBuilder {
  private readonly chunks: Uint8Array[] = [];
  private totalLength = 0;

  write(...bytes: number[]): void {
    if (bytes.length === 0) return;
    const chunk = Uint8Array.from(bytes);
    this.chunks.push(chunk);
    this.totalLength += chunk.length;
  }

  writeText(text: string): void {
    const chunk = textEncoder.encode(text);
    this.chunks.push(chunk);
    this.totalLength += chunk.length;
  }

  writeLf(): void {
    this.write(ESC_POS_BYTES.LF);
  }

  toUint8Array(): Uint8Array {
    const output = new Uint8Array(this.totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }
}

function encodeCommand(builder: EscPosByteBuilder, command: EscPosCommand): void {
  switch (command.type) {
    case "initialize":
      builder.write(ESC_POS_BYTES.ESC, ESC_POS_BYTES.INIT);
      return;
    case "align":
      builder.write(
        ESC_POS_BYTES.ESC,
        ESC_POS_BYTES.ALIGN,
        ESC_POS_ALIGN_VALUE[command.value]
      );
      return;
    case "text":
      builder.writeText(command.value);
      builder.writeLf();
      return;
    case "separator":
      builder.writeText("-".repeat(DEFAULT_SEPARATOR_LENGTH));
      builder.writeLf();
      return;
    case "feed":
      builder.write(ESC_POS_BYTES.ESC, ESC_POS_BYTES.FEED, command.lines);
      return;
    case "cut":
      builder.write(ESC_POS_BYTES.GS, ESC_POS_BYTES.CUT, ESC_POS_CUT_PARTIAL);
      return;
    default:
      throw new Error("Unsupported ESC/POS command");
  }
}

function encodeEscPosCommands(commands: EscPosCommand[]): Uint8Array {
  const builder = new EscPosByteBuilder();
  for (const command of commands) {
    encodeCommand(builder, command);
  }
  return builder.toUint8Array();
}

function renderAgentTicketCommands(
  ticket: AgentJobTicketPayload,
  createdAt: Date
): EscPosCommand[] {
  const commands: EscPosCommand[] = [
    { type: "initialize" },
    { type: "align", value: "center" },
    { type: "text", value: "Kitchen Order" },
    { type: "align", value: "left" },
    { type: "text", value: `Order Number: ${ticket.orderId}` },
    { type: "text", value: `Created Time: ${createdAt.toISOString()}` },
    { type: "separator" },
  ];

  for (const item of ticket.items) {
    commands.push({ type: "text", value: `${item.quantity}x ${item.itemName}` });
    if (item.notes) {
      commands.push({ type: "text", value: `* ${item.notes}` });
    }
  }

  commands.push({ type: "separator" });
  commands.push({ type: "feed", lines: 3 });
  commands.push({ type: "cut" });
  return commands;
}

export function buildEscPosPayloadFromAgentTicket(input: {
  ticket: AgentJobTicketPayload;
  createdAt?: Date;
}): EscPosPayload {
  const createdAt = input.createdAt ?? new Date(0);
  const bytes = encodeEscPosCommands(renderAgentTicketCommands(input.ticket, createdAt));
  return {
    kind: ESC_POS_PAYLOAD_KIND,
    bytes,
    byteLength: bytes.length,
    encoding: "escpos",
  };
}

