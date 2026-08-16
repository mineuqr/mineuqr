/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1
 * Logical POS Terminal — not hardware, cashier, register, or shift.
 */

export const POS_TERMINAL_LIFECYCLES = [
  "registered",
  "active",
  "deactivated",
  "replaced",
] as const;

export type PosTerminalLifecycle = (typeof POS_TERMINAL_LIFECYCLES)[number];

export type PosTerminal = {
  id: string;
  restaurantId: number;
  code: string;
  lifecycle: PosTerminalLifecycle;
  replacedByTerminalId: string | null;
  optionalDeviceId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export function isProvisionedLifecycle(lifecycle: PosTerminalLifecycle): boolean {
  return lifecycle === "registered" || lifecycle === "active";
}

export function nextPosTerminalCode(existingCodes: readonly string[]): string {
  let max = 0;
  for (const code of existingCodes) {
    const match = /^POS-(\d+)$/.exec(code);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `POS-${String(max + 1).padStart(3, "0")}`;
}
