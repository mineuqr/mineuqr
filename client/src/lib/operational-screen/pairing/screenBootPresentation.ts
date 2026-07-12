import type { BootstrapPhase } from "@/lib/operational-screen/runtimeTypes";
import { screenBootLoadingCopy } from "./pairingPresentation";

export function resolveScreenBootLoadingMessage(
  phase: BootstrapPhase,
  role: string | null,
  language: string = "en"
): string {
  const copy = screenBootLoadingCopy(language);
  switch (phase) {
    case "loading":
      return copy.checking;
    case "validating":
      return copy.connecting;
    case "context_ready":
      return copy.starting;
    case "heartbeat_active":
      return role === "kitchen_display" || role === "expo_display"
        ? copy.startingKitchen
        : copy.starting;
    default:
      return copy.connecting;
  }
}
