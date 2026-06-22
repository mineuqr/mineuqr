/**
 * THERMAL-PRINTING-13B — receipt render plan → ESC/POS document.
 */
import { DEFAULT_SEPARATOR_LENGTH } from "./escposConstants";
import type { ReceiptRenderPlan } from "../receipts/layoutEngine";
import type { EscPosAlign, EscPosCommand, EscPosDocument } from "./escposTypes";

function separatorCommand(line: string): EscPosCommand {
  if (line === "-".repeat(DEFAULT_SEPARATOR_LENGTH)) {
    return { type: "separator" };
  }
  return { type: "separator", line };
}

export function receiptRenderPlanToEscPosDocument(plan: ReceiptRenderPlan): EscPosDocument {
  const commands: EscPosCommand[] = [{ type: "initialize" }];
  let currentAlign: EscPosAlign | undefined;

  for (const block of plan.blocks) {
    if (block.kind === "separator") {
      commands.push(separatorCommand(block.line));
      continue;
    }

    if (block.line.alignment !== currentAlign) {
      commands.push({ type: "align", value: block.line.alignment });
      currentAlign = block.line.alignment;
    }
    commands.push({ type: "text", value: block.line.text });
  }

  if (plan.feedLines > 0) {
    commands.push({ type: "feed", lines: plan.feedLines });
  }
  if (plan.cut) {
    commands.push({ type: "cut" });
  }

  return { commands };
}
