/**
 * PRINTING-RENDERING-1B — TicketLayoutPlan → ESC/POS document.
 */
import type { EscPosCommand, EscPosDocument } from "../../escpos/escposTypes";
import { resolveSemanticTextStyle } from "./typography";
import type { TicketLayoutPlan } from "./ticketLayoutTypes";
import {
  resolveTicketRenderCapabilityDecision,
  type TicketRenderDeviceCapabilities,
} from "./renderCapabilities";

export function ticketLayoutPlanToEscPosDocument(
  plan: TicketLayoutPlan,
  options: { capabilities?: TicketRenderDeviceCapabilities } = {}
): EscPosDocument {
  const capabilityDecision = resolveTicketRenderCapabilityDecision({
    documentCut: plan.cut,
    capabilities: options.capabilities,
  });

  const commands: EscPosCommand[] = [{ type: "initialize" }];

  for (const line of plan.lines) {
    if (line.isSeparator) {
      commands.push({ type: "separator", line: line.text });
      continue;
    }

    const style = resolveSemanticTextStyle(line.typography);
    commands.push({
      type: "text",
      value: line.text,
      align: line.alignment,
      style: {
        bold: style.bold,
        doubleWidth: style.doubleWidth,
        doubleHeight: style.doubleHeight,
      },
    });
  }

  if (plan.feedLines > 0) {
    commands.push({ type: "feed", lines: plan.feedLines });
  }
  if (capabilityDecision.emitCut) {
    commands.push({ type: "cut" });
  }

  return { commands };
}
