/**
 * THERMAL-PRINTING-13B — ESC/POS semantic document → Uint8Array encoder (authoritative).
 */
import {
  DEFAULT_SEPARATOR_LENGTH,
  ESC_POS_ALIGN_VALUE,
  ESC_POS_BYTES,
  ESC_POS_CUT_PARTIAL,
  ESC_POS_EMPHASIZE,
  resolveEscPosCharacterSizeMask,
} from "./escposConstants";
import { encodeMonochromeBitmapToGsV0 } from "./escposRasterEncoder";
import type { EscPosAlign, EscPosCommand, EscPosDocument, EscPosTextStyle } from "./escposTypes";

const textEncoder = new TextEncoder();

export class EscPosEncodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscPosEncodingError";
  }
}

export class EscPosByteBuilder {
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

function assertValidFeedLines(lines: number): void {
  if (!Number.isInteger(lines) || lines <= 0) {
    throw new EscPosEncodingError(`Invalid feed lines: ${lines}`);
  }
}

function encodeAlign(builder: EscPosByteBuilder, value: EscPosAlign): void {
  builder.write(
    ESC_POS_BYTES.ESC,
    ESC_POS_BYTES.ALIGN,
    ESC_POS_ALIGN_VALUE[value]
  );
}

function encodeTextStyle(builder: EscPosByteBuilder, style?: EscPosTextStyle): void {
  const sizeMask = resolveEscPosCharacterSizeMask(style);
  builder.write(ESC_POS_BYTES.GS, ESC_POS_BYTES.CHAR_SIZE, sizeMask);
  if (style?.bold) {
    builder.write(ESC_POS_BYTES.ESC, ESC_POS_BYTES.EMPHASIZE_ON, ESC_POS_EMPHASIZE.on);
  } else {
    builder.write(ESC_POS_BYTES.ESC, ESC_POS_BYTES.EMPHASIZE_ON, ESC_POS_EMPHASIZE.off);
  }
}

function resetTextStyle(builder: EscPosByteBuilder): void {
  builder.write(ESC_POS_BYTES.GS, ESC_POS_BYTES.CHAR_SIZE, 0x00);
  builder.write(ESC_POS_BYTES.ESC, ESC_POS_BYTES.EMPHASIZE_ON, ESC_POS_EMPHASIZE.off);
}

function encodeCommand(builder: EscPosByteBuilder, command: EscPosCommand): void {
  switch (command.type) {
    case "initialize":
      builder.write(ESC_POS_BYTES.ESC, ESC_POS_BYTES.INIT);
      return;
    case "align":
      encodeAlign(builder, command.value);
      return;
    case "text": {
      if (command.align) {
        encodeAlign(builder, command.align);
      }
      if (command.style) {
        encodeTextStyle(builder, command.style);
        builder.writeText(command.value);
        builder.writeLf();
        resetTextStyle(builder);
      } else {
        builder.writeText(command.value);
        builder.writeLf();
      }
      return;
    }
    case "separator":
      builder.writeText(command.line ?? "-".repeat(DEFAULT_SEPARATOR_LENGTH));
      builder.writeLf();
      return;
    case "feed":
      assertValidFeedLines(command.lines);
      builder.write(ESC_POS_BYTES.ESC, ESC_POS_BYTES.FEED, command.lines);
      return;
    case "cut":
      builder.write(ESC_POS_BYTES.GS, ESC_POS_BYTES.CUT, ESC_POS_CUT_PARTIAL);
      return;
    case "drawer-kick":
      builder.write(ESC_POS_BYTES.ESC, 0x70, command.pin ?? 0x00, 0x19, 0xfa);
      return;
    case "raster": {
      const rasterBytes = encodeMonochromeBitmapToGsV0(command.bitmap);
      builder.write(...Array.from(rasterBytes));
      builder.writeLf();
      return;
    }
    default:
      throw new EscPosEncodingError(
        `Unsupported ESC/POS command type: ${(command as { type?: string }).type ?? "unknown"}`
      );
  }
}

export function encodeEscPosDocument(document: EscPosDocument): Uint8Array {
  const builder = new EscPosByteBuilder();
  for (const command of document.commands) {
    encodeCommand(builder, command);
  }
  return builder.toUint8Array();
}

export function encodeEscPosCommands(commands: EscPosCommand[]): Uint8Array {
  return encodeEscPosDocument({ commands });
}
